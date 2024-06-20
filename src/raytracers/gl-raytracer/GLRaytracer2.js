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
import spectrumTable from "./spectrumTable.js";

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
            maxBounce: 7
        };

        this.display = {
            rays: true,
            hitSpans: true,
            normals: true,
            paths: true
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
                width: 1024, heigh: 1024,
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
                    color: [0,0,0,1]
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


        this.spectrum = regl.texture({
            width: spectrumTable.length/4,
            height: 1,
            data: spectrumTable,
            wrap: 'clamp',
            min: "nearest", 
            mag: "nearest",
            format: "rgba",
            type: "float"
        });

        const RaysCount = 16; // default size for tyextures
        const dataTextureRadius = Math.ceil(Math.sqrt(RaysCount)); // get radius to fit
        const common_settings = {
            width: dataTextureRadius,
            height: dataTextureRadius,
            wrap: 'clamp',
            min: "nearest", 
            mag: "nearest"
        }
        this.randomNumberPerRay =  regl.texture({...common_settings,
            format: "luminance",
            type: "float",
        });
        this.texturesFront = {
            rayTransform: regl.texture({...common_settings,
                format: "rgba", /*x,y,dx, dy*/
                type: "float",
            }),
            rayProperties: regl.texture({...common_settings,
                format: "rgba",/*intensity, wavelength*/
                type: "float",
            }),
            rayColor: regl.texture({...common_settings,
                format: "rgba", /* rgb+ color perceptual visibility as alpha */
                type: "float",
            }),
            hitPoint: regl.texture({...common_settings,
                format: "rgba", /*x,y,nx,ny*/
                type: "float",
            }),
            hitSpan: regl.texture({...common_settings,
                format: "rgba",/* x1,y1,x2,y2 */
                type: "float",
            }),
            rayPath: regl.texture({...common_settings,
                format: "rgba",/* x1,y1,x2,y2 */
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

        this.sceneFBO = regl.framebuffer({
            color: regl.texture(texture_settings),
            depth: false
        });

        this.postFrontFBO = regl.framebuffer({
            color: regl.texture(texture_settings),
            depth: false
        });

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
            framebuffer: this.sceneFBO, 
            color: [0,0,0,1.0]
        });
        regl.clear({
            framebuffer: this.postBackFBO, 
            color: [0,0,0,1.0]
        });
        regl.clear({
            framebuffer: this.postFrontFBO, 
            color: [0,0,0,1.0]
        });

        this.totalPasses = 0;
    }

    renderPass(scene, viewBox)
    {
        const regl = this.regl;

        if(!scene || !viewBox)
        {
            regl.clear({framebuffer: null, color: [0,0,0,1.0]});
            return;
        }

        /* Cast initial rays */
        /* filter entities to lights */
        const lightEntities = Object.fromEntries(Object.entries(scene)
            .filter( ([key, entity])=>
                entity.hasOwnProperty("light") && 
                entity.hasOwnProperty("transform")
            ))

        if(Object.keys(lightEntities).length<1){
            regl.clear({framebuffer: null, color: [0,0,0,1.0]});
            return;
        }

        const totalLightIntensity = Object.values(lightEntities).reduce( (accumulator, lightEntity)=>{
            return accumulator+lightEntity.light.intensity;
        }, 0.0 );

        const rays = Object.entries(lightEntities)
            .map( ([key, entity])=>{
                const totalSamples = this.settings.lightSamples;
                const lightSamples = totalSamples * entity.light.intensity/totalLightIntensity;

                switch (entity.light.type) {
                    case "point":
                        return samplePointLight(entity, lightSamples);
                    case "laser":
                        return sampleLaserLight(entity, lightSamples);
                    case "directional":
                        return sampleDirectionalLight(entity, lightSamples);
                    default:
                        throw Error("light type is not supported", entity.light.type)
                }
            }).flat(1);


        /* Upload rays the textures */
        // calc output texture resolution to hold rays data on the GPU
        const dataTextureRadius = Math.ceil(Math.sqrt(this.settings.lightSamples));
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
                [ray.intensity, ray.wavelength, 0, 0]
            ).extend([0,0,0,0], dataTextureRadius**2)
        });
        this.randomNumberPerRay({...common_raytrace_textures_settings,
            data: Array.from({length: dataTextureRadius**2}).map(_=>
                [Math.random(), Math.random(), Math.random(), Math.random()]
            )
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
                case "glass":
                    return [2, entity.material.roughness || 0.0, entity.material.ior || 1.0, entity.material.dispersion || 0.2];
                case "mirror":
                    return [1, entity.material.roughness || 0.0, 0.0, 0.0];
                case "diffuse":
                    return [3, entity.material.roughness || 0.0, 0.0, 0.0];
                default:
                    return [-1,0,0,0];
            }
        });

        /************ *
         * TRACE RAYS *
         * ********** */

        /* resize output framebuffers */
        regl.clear({framebuffer: this.sceneFBO, color: [0,0,0,1.0]});
        if(this.sceneFBO.width!=this.outputResolution[0] || this.sceneFBO.height!=this.outputResolution[1])
        {
            this.sceneFBO.resize(this.outputResolution[0], this.outputResolution[1]);
            this.postFrontFBO.resize(this.outputResolution[0], this.outputResolution[1]);
            this.postBackFBO.resize(this.outputResolution[0], this.outputResolution[1]);
        }

        for(let i=0; i<this.settings.maxBounce; i++){
            /* draw rays */
            this.display.rays && drawRays(regl, {
                raysCount: rays.length,
                raysTexture: this.texturesFront.rayTransform,
                raysLength: 50.0,
                raysColor: [0.7,0.3,0,0.3],
                outputResolution: this.outputResolution,
                viewport: {x: viewBox.x, y: viewBox.y, width: viewBox.w, height: viewBox.h},
                framebuffer: this.sceneFBO
            });

            // /* draw intersection spans */
            // this.display.hitSpans && drawLineSegments(regl, {
            //     linesCount: rays.length,
            //     lineSegments: this.texturesBack.hitSpan,
            //     color: [0,1,1,0.03],
            //     outputResolution: this.outputResolution,
            //     viewport: {x: viewBox.x, y: viewBox.y, width: viewBox.w, height: viewBox.h},
            //     framebuffer: this.sceneFBO
            // });

            /* draw hitpoints */
            this.display.normals && drawRays(regl, {
                raysCount: rays.length,
                raysTexture: this.texturesBack.hitPoint,
                raysLength: 20.0,
                raysColor: [0.0,0.9,0,0.1],
                outputResolution: this.outputResolution,
                viewport: {x: viewBox.x, y: viewBox.y, width: viewBox.w, height: viewBox.h},
                framebuffer: this.sceneFBO
            });

            /* draw light paths */
            this.display.paths && drawLineSegments(regl, {
                linesCount: rays.length,
                lineSegments: this.texturesBack.rayPath,
                colors: this.texturesBack.rayColor,
                outputResolution: this.outputResolution,
                viewport: {x: viewBox.x, y: viewBox.y, width: viewBox.w, height: viewBox.h},
                framebuffer: this.sceneFBO
            });

            regl({...QUAD, vert:PASS_THROUGH_VERTEX_SHADER,
                framebuffer: this.raytraceBackFBO,
                uniforms: {
                    SEED: Math.random()*this.totalPasses,
                    resolution: [this.raytraceBackFBO.width, this.raytraceBackFBO.height],
                    rayTransformTexture: this.texturesFront.rayTransform,
                    rayPropertiesTexture: this.texturesFront.rayProperties,
                    randomNumberPerRay: this.randomNumberPerRay,
                    spectralTexture: this.spectrum,
                    shapesCount: shapeData.length,
                    ...shapeEntities.length>0 && { // include shape info in uniforms only if they exist. otherwise regl throws an error. TODO: review this
                        CSGTransformData: transformData.flat(),
                        CSGShapeData: shapeData.flat(),
                        CSGMaterialData: materialData.flat()
                    }
                },
                frag: raytracePassShader
            })();

            /* swap buffers */
            [this.raytraceFrontFBO,            this.raytraceBackFBO]            = [this.raytraceBackFBO,            this.raytraceFrontFBO];
            [this.texturesFront.rayTransform,  this.texturesBack.rayTransform]  = [this.texturesBack.rayTransform,  this.texturesFront.rayTransform];
            [this.texturesFront.rayProperties, this.texturesBack.rayProperties] = [this.texturesBack.rayProperties, this.texturesFront.rayProperties];
            [this.texturesFront.rayColor,      this.texturesBack.rayColor]      = [this.texturesBack.rayColor,      this.texturesFront.rayColor];
            [this.texturesFront.hitPoint,      this.texturesBack.hitPoint]      = [this.texturesBack.hitPoint,      this.texturesFront.hitPoint];
            [this.texturesFront.hitSpan,       this.texturesBack.hitSpan]       = [this.texturesBack.hitSpan,       this.texturesFront.hitSpan];
            [this.texturesFront.rayPath,       this.texturesBack.rayPath]       = [this.texturesBack.rayPath,       this.texturesFront.rayPath];
        }

        /* *************** *
         * POST PROCESSING *
         * *************** */

        /* accumulate */
        this.totalPasses+=1;
        regl({...QUAD,
            framebuffer: this.postFrontFBO,
            viewport: {x:0, y:0, width:this.outputResolution[0], height: this.outputResolution[1]},
            vert: PASS_THROUGH_VERTEX_SHADER,
            depth: { enable: false },
            uniforms:{
                textureA: this.sceneFBO,
                textureB: this.postBackFBO
            },
            // blend: {
            //     enable: true,
            //     func: {
            //         srcRGB: 'one',
            //         dstRGB: 'one',
            //         srcAlpha: 'one',
            //         dstAlpha: 'one',
            //     },
            //     equation: {
            //         rgb: 'add',
            //         alpha: 'add'
            //     },
            //     color: [0,0,0,0]
            // },
            frag:/*glsl*/`precision mediump float;
            varying vec2 vUV;
            uniform sampler2D textureA;
            uniform sampler2D textureB;
        
            vec3 filmic(vec3 x) {
                vec3 X = max(vec3(0.0), x - 0.004);
                vec3 result = (X * (6.2 * X + 0.5)) / (X * (6.2 * X + 1.7) + 0.06);
                return pow(result, vec3(2.2));
            }

            void main() {
                vec4 texA = texture2D(textureA, vUV).rgba;
                vec4 texB = texture2D(textureB, vUV).rgba;
                gl_FragColor = vec4(texA.rgb+texB.rgb, 1.0);
            }`
        })();

        /* render post processing FBO to screen */
        regl({...QUAD,
            framebuffer: null,
            viewport: {x:0, y:0, width:this.outputResolution[0], height: this.outputResolution[1]},
            vert: PASS_THROUGH_VERTEX_SHADER,
            depth: { enable: false },
            uniforms:{
                texture: this.postFrontFBO,
                outputResolution: this.outputResolution,
                totalPasses: this.totalPasses,
                exposure: 10.0
            },
            frag:/*glsl*/`precision mediump float;
            varying vec2 vUV;
            uniform sampler2D texture;
            uniform float totalPasses;
            uniform float exposure;

            vec3 ACEScgFromLinearRGB(vec3 linearRGB)
            {
                // Transformation matrix from linear sRGB to ACEScg
                const mat3 ACEScgMatrix = mat3(
                    0.6624541811085053, 0.13400420645643313, 0.1561876870049078,
                    0.27222871678091454, 0.6740817658111483,  0.05368951740793705,
                    0.005574649490039499, 0.004060733528982825, 0.9833800523172168
                );

                return ACEScgMatrix * linearRGB;
            }

            vec3 linearRGBFromACEScg(vec3 ACEScgRGB)
            {
                // Inverse transformation matrix from ACEScg to linear sRGB
                const mat3 inverseACEScgMatrix = mat3(
                    1.6410233797, -0.3248032942, -0.2364246952,
                    -0.6636628587,  1.6153315917,  0.0167563477,
                    0.0117218943, -0.0082844420,  1.0082749946
                );

                return inverseACEScgMatrix * ACEScgRGB;
            }

            vec3 sRGBFromRGB(vec3 linearRGB){
                float gamma = 1.0 / 2.2;
                vec3 sRGB = pow(linearRGB, vec3(gamma));
                return sRGB;
            }

            vec3 linearRGBFromsRGB(vec3 sRGB){
                float gamma = 2.2;
                vec3 linearRGB = pow(sRGB, vec3(gamma));
                return linearRGB;
            }

            vec3 rec709FromRGB(vec3 linearRGB){
                vec3 rec709RGB;
                for (int i = 0; i < 3; i++) {
                    if (linearRGB[i] < 0.018) {
                        rec709RGB[i] = linearRGB[i] * 4.5;
                    } else {
                        rec709RGB[i] = 1.099 * pow(linearRGB[i], 0.45) - 0.099;
                    }
                }
                return rec709RGB;
            }
        
            vec3 filmic(vec3 x) {
                vec3 X = max(vec3(0.0), x - 0.004);
                vec3 result = (X * (6.2 * X + 0.5)) / (X * (6.2 * X + 1.7) + 0.06);
                return pow(result, vec3(2.2));
            }

            void main()
            {
                // get linear RGB color
                vec3 color = texture2D(texture, vUV).rgb;
                
                color *= 1.0/totalPasses;

                // apply exposure in ACEScg colorspace
                color = ACEScgFromLinearRGB(color);
                color*=exposure;

                /* convert ACES to display colorspace*/
                // color = sRGBFromRGB(color);
                color = linearRGBFromACEScg(color);
                color = sRGBFromRGB(color);
                // color = filmic(color);
                gl_FragColor = vec4(color, 1.0);
            }`
        })();
        
        [this.postFrontFBO, this.postBackFBO]=[this.postBackFBO, this.postFrontFBO]
    }
}



export default GLRaytracer;