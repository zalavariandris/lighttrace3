// @flow
/*
 * GL Renderer
 */
import createREGL from "regl"

import { drawTexture } from "./operators/drawTexture.js";
import { drawCSGToSDF } from "./operators/drawCSGToSDF.js";
import { intersectRaysWithSDF } from "./operators/intersectRaysWithSDF.js";
import { drawLineSegments, drawLinesBetweenPoints} from "./operators/drawLines.js";
import { drawRays} from "./operators/drawRays.js"

import QUAD from "./QUAD.js"
import { loadShader } from "./shaders/load-shader.js"
const PASS_THROUGH_VERTEX_SHADER = await loadShader("./src/raytracers/gl-raytracer/shaders/PASS_THROUGH_VERTEX_SHADER.fs");
const raytracePassShader = await loadShader("./src/raytracers//gl-raytracer/shaders/raytracePass.fs");
import { samplePointLight, sampleLaserLight, sampleDirectionalLight } from "../sampleLights.js";

import { myrandom } from "../../utils.js";

function sampleLight(entity, lightSamples)
{
    switch (entity.light.type) {
        case "point":
            return samplePointLight(entity, lightSamples);
        case "laser":
            return sampleLaserLight(entity, lightSamples);
        case "directional":
            return sampleDirectionalLight(entity, lightSamples);
    }
}

function loadImageData(imagePath){
    return new Promise(resolve => {
        const im = new Image();
        im.crossOrigin = "anonymous";
        im.src = imagePath;
        im.onload = () => {
            var canvas = document.createElement("canvas");
            canvas.width = im.width;
            canvas.height = im.height;
            var ctx = canvas.getContext("2d");
            ctx.drawImage(im, 0, 0);

            const imageData = ctx.getImageData(0, 0, im.width, im.height);
    
            resolve(imageData);
        };
    })
}

const spectralImage = await loadImageData("./src/Spectrum-cropped.png");

Array.prototype.extend = function(value, newLength)
{
    const oldLength = this.length;
    this.length = newLength
    this.fill(value, oldLength, newLength);
    return this
}

class GLRaytracer{
    constructor(canvas)
    {
        this.canvas = canvas;
        this.outputResolution/*: number */ = [16, 16];
        this.listeners = []
        this.totalPasses = 0;

        // settings
        this.settings = {
            lightSamples: Math.pow(4,5),//128*128; //Math.pow(4,4);
            debug: true,
            maxBounce: 7,
            downres: 1,
        };
    }

    initGL()
    {
        this.initRegl();
        this.initRaytraceBuffers();
        this.initPostProcessingBuffers();
    }

    initRegl(){
        this.regl = createREGL({
            canvas: this.canvas,
            // pixelRatio: 2.0,
            attributes: {
                // width: 1024, heigh: 1024,
                alpha: false,
                depth: false,
                stencil: false,
                antialias: false,
                premultipliedAlpha: false,
                preserveDrawingBuffer: false,
                preferLowPowerToHighPerformance: false,
                failIfMajorPerformanceCaveat: false,
                blend: {
                    enable: true,
                    func: {
                        srcRGB: 'one',
                        dstRGB: 'one',
                        srcAlpha: 'one',
                        dstAlpha: 'one',
                    },
                    equation: {
                        rgb: 'add',
                        alpha: 'add'
                    },
                    color: [0,0,0,0]
                },
            },
            extensions: [
                'WEBGL_draw_buffers', // multiple render targets
                'OES_texture_float'
            ]
        });
    }

    initRaytraceBuffers()
    {
        const regl = this.regl;
        const lightsCount = 2;
        const RaysCount = 16**2; // default size for tyextures
        const dataTextureRadius = Math.ceil(Math.sqrt(RaysCount)); // get radius to fit
        const common_settings = {
            width: dataTextureRadius,
            height: dataTextureRadius,
            wrap: 'clamp',
            min: "nearest", 
            mag: "nearest"
        }
        this.texturesFront = {
            rayTransform: regl.texture({...common_settings,
                format: "rgba",
                type: "float",
            }),
            rayProperties: regl.texture({...common_settings,
                format: "rgba",
                type: "float",
            }),
            rayColor: regl.texture({...common_settings,
                format: "rgba",
                type: "float",
            }),
            hitPoint: regl.texture({...common_settings,
                format: "rgba",
                type: "float",
            }),
            hitSpan: regl.texture({...common_settings,
                format: "rgba",
                type: "float",
            }),
            rayPath: regl.texture({...common_settings,
                format: "rgba",
                type: "float",
            })
        };

        this.texturesBack = {
            rayTransform: regl.texture({...common_settings,
                format: "rgba",
                type: "float",
            }),
            rayProperties: regl.texture({...common_settings,
                format: "rgba",
                type: "float",
            }),
            rayColor: regl.texture({...common_settings,
                format: "rgba",
                type: "float",
            }),
            hitPoint: regl.texture({...common_settings,
                format: "rgba",
                type: "float",
            }),
            hitSpan: regl.texture({...common_settings,
                format: "rgba",
                type: "float",
            }),
            rayPath: regl.texture({...common_settings,
                format: "rgba",
                type: "float",
            })
        };

        /* Framebuffers for raytracing */
        this.raytraceFrontFBO = regl.framebuffer({
            color: [
                this.texturesFront.rayTransform,
                this.texturesFront.rayProperties,
                this.texturesFront.rayColor,
                this.texturesFront.hitPoint,
                this.texturesFront.hitSpan,
                this.texturesFront.rayPath
            ],
            depth: false
        });

        this.raytraceBackFBO = regl.framebuffer({
            color: [
                this.texturesBack.rayTransform,
                this.texturesBack.rayProperties,
                this.texturesBack.rayColor,
                this.texturesBack.hitPoint,
                this.texturesBack.hitSpan,
                this.texturesBack.rayPath
            ],
            depth: false
        });
    }

    initPostProcessingBuffers()
    {
        const regl = this.regl;
        /* post processing */
        const texture_settings = {
            width: this.outputResolution[0],
            height: this.outputResolution[1],
            wrap: 'clamp',
            min: "nearest", 
            mag: "nearest",
            format: "rgba",
            type: "float",
        }

        this.postFrontFBO = regl.framebuffer({
            color: regl.texture(texture_settings),
            depth: false    
        });

        /* Framebuffers for post processing */
        this.postBackFBO = regl.framebuffer({
            color: regl.texture(texture_settings),
            depth: false    
        });
    }

    resizeGL()
    {
        const [width, height] = [this.canvas.clientWidth, this.canvas.clientHeight];
        this.canvas.width = width;
        this.canvas.height = height;
        this.outputResolution = [width, height]
    }

    clear()
    {
        const regl = this.regl;
        regl.clear({
            framebuffer: this.postFbo1, 
            color: [0,0,0,1.0]
        });
        regl.clear({
            framebuffer: this.postFbo2, 
            color: [0,0,0,1.0]
        });
        this.totalPasses=0;
    }

    renderPass(scene, viewBox)
    {
        const regl = this.regl;

        /* Cast initial rays */
        /* filter entities to lights */
        const rays = Object.entries(scene)
            .filter( ([key, entity])=>
                entity.hasOwnProperty("light") && 
                entity.hasOwnProperty("transform")
            )
            .map( ([key, entity])=>{
                switch (entity.light.type) {
                    case "point":
                        return samplePointLight(entity, this.settings.lightSamples);
                    case "laser":
                        return sampleLaserLight(entity, this.settings.lightSamples);
                    case "directional":
                        return sampleDirectionalLight(entity, this.settings.lightSamples);
                    default:
                        return makeRay(0,0,0,0,0,0);
                }
            }).flat(1);


        /* Upload rays the textures */
        // calc output texture resolution to hold rays data on the GPU
        const dataTextureRadius = Math.ceil(Math.sqrt(rays.length));
        this.raytraceFrontFBO.resize(dataTextureRadius);
        this.raytraceBackFBO.resize(dataTextureRadius);

        const common_raytrace_textures_settings = {
            width: dataTextureRadius,
            height: dataTextureRadius,
            format: "rgba",
            type: "float"
        };
        this.texturesFront.rayTransform({...common_raytrace_textures_settings,
            data: rays.map(ray=>
                [ray.x, ray.y, ray.dx, ray.dy]
            ).extend([0,0,0,0], dataTextureRadius**2)
        });
        this.texturesFront.rayProperties({...common_raytrace_textures_settings,
            data: rays.map(ray=>
                [ray.wavelength, ray.wavelength, ray.wavelength, ray.intensity]
            ).extend([0,0,0,0], dataTextureRadius**2)
        });

        /* Prepare Scene data for GPU */
        const shapeEntities = Object.values(scene).filter(entity=>
            entity.hasOwnProperty("shape") && 
            entity.hasOwnProperty("transform") && 
            entity.hasOwnProperty("material")
        );

        const transformData = shapeEntities.map(entity=>
            [entity.transform.translate.x, entity.transform.translate.y, entity.transform.rotate || 0.0]
        );

        const shapeData = shapeEntities.map(entity=>{
            switch (entity.shape.type) {
                case "circle":
                    return [0, entity.shape.radius,0,0];
                case "rectangle":
                    return [1, entity.shape.width, entity.shape.height, 0];
                case "sphericalLens":
                    return [2, entity.shape.diameter, entity.shape.edgeThickness, entity.shape.centerThickness];
                case "triangle":
                    return [3, entity.shape.size, 0,0];
                case "line":
                    return [4, entity.shape.length, 0,0];
                default:
                    return [0, 10,0,0];
            }
        });

        const materialData = shapeEntities.map(entity=>{
            switch (entity.material.type) {
                case "mirror":
                    return [0, entity.material.roughness || 0.0, entity.material.ior || 1.0, entity.material.dispersion || 0.0];
                case "glass":
                    return [1, entity.material.roughness || 0.0, entity.material.ior || 1.0, entity.material.dispersion || 0.0];
                case "diffuse":
                    return [2, entity.material.roughness || 0.0, entity.material.ior || 1.0, entity.material.dispersion || 0.0];
                default:
                    return [0,0,0,0];
            }
        });

        /************ *
         * TRACE RAYS *
         * ********** */
        regl.clear({color: [0,0.0,0,1]});
        console.log(this.settings)
        for(let i=0;i<this.settings.maxBounce; i++){
            regl({...QUAD, vert:PASS_THROUGH_VERTEX_SHADER,
                framebuffer: this.raytraceBackFBO,
                uniforms: {
                    SEED: Math.random()*500,
                    resolution: [this.raytraceBackFBO.width, this.raytraceBackFBO.height],
                    rayTransformTexture: this.texturesFront.rayTransform,
                    rayPropertiesTexture: this.texturesFront.rayProperties,
                    shapesCount: shapeData.length,
                    ...shapeEntities.length>0 && { // include shape info in uniforms only if they exist. otherwise regl throws an error. TODO: review this
                        CSGTransformData: transformData.flat(),
                        CSGShapeData: shapeData.flat(),
                        CSGMaterialData: materialData.flat()
                    }
                },
                frag: raytracePassShader
            })();

            if(this.settings.debug){

            /* draw rays */
            drawRays(regl, {
                raysCount: rays.length,
                raysTexture: this.texturesFront.rayTransform,
                raysLength: 50.0,
                raysColor: [0.7,0.3,0,0.3],
                outputResolution: this.outputResolution,
                viewport: {x: viewBox.x, y: viewBox.y, width: viewBox.w, height: viewBox.h},
                framebuffer: null
            });

            /* draw intersection spans */
            drawLineSegments(regl, {
                linesCount: rays.length,
                lineSegments: this.texturesBack.hitSpan,
                color: [0,1,1,0.03],
                outputResolution: this.outputResolution,
                viewport: {x: viewBox.x, y: viewBox.y, width: viewBox.w, height: viewBox.h},
                framebuffer: null
            });

            /* draw hitpoints */
            drawRays(regl, {
                raysCount: rays.length,
                raysTexture: this.texturesBack.hitPoint,
                raysLength: 20.0,
                raysColor: [0.0,0.9,0,0.1],
                outputResolution: this.outputResolution,
                viewport: {x: viewBox.x, y: viewBox.y, width: viewBox.w, height: viewBox.h},
                framebuffer: null
            });
            }

            /* draw light paths */
            drawLineSegments(regl, {
                linesCount: rays.length,
                lineSegments: this.texturesBack.rayPath,
                color: [1,1,1,0.1],
                outputResolution: this.outputResolution,
                viewport: {x: viewBox.x, y: viewBox.y, width: viewBox.w, height: viewBox.h},
                framebuffer: null
            });

            /* swap buffers */
            [this.texturesFront.rayTransform, this.texturesBack.rayTransform] = [this.texturesBack.rayTransform, this.texturesFront.rayTransform];
            [this.texturesFront.rayProperties, this.texturesBack.rayProperties] = [this.texturesBack.rayProperties, this.texturesFront.rayProperties];
            [this.texturesFront.rayColor, this.texturesBack.rayColor] = [this.texturesBack.rayColor, this.texturesFront.rayColor];
            [this.texturesFront.hitPoint, this.texturesBack.hitPoint] = [this.texturesBack.hitPoint, this.texturesFront.hitPoint];
            [this.texturesFront.hitSpan, this.texturesBack.hitSpan] = [this.texturesBack.hitSpan, this.texturesFront.hitSpan];
            [this.texturesFront.rayPath, this.texturesBack.rayPath] = [this.texturesBack.rayPath, this.texturesFront.rayPath];
            
            [this.raytraceFrontFBO, this.raytraceBackFBO] = [this.raytraceBackFBO, this.raytraceFrontFBO];
        }

        /* *************** *
         * POST PROCESSING *
         * *************** *

        /* draw to screen */

        
    }
}



export default GLRaytracer;