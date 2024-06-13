/*
 * GL Renderer
 */
import createREGL from "regl"

import { drawTexture } from "./operators/drawTexture.js";
import { drawCSGToSDF } from "./operators/drawCSGToSDF.js";
import { intersectRaysWithSDF } from "./operators/intersectRaysWithSDF.js";
import { drawLines} from "./operators/drawLines.js";
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
        this.outputResolution = [16, 16];
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
        };

        /* Framebuffers for raytracing */
        this.raytraceFrontFBO = regl.framebuffer({
            color: [
                this.texturesFront.rayTransform,
                this.texturesFront.rayProperties,
                this.texturesFront.rayColor,
                this.texturesFront.hitPoint
            ],
            depth: false
        });

        this.raytraceBackFBO = regl.framebuffer({
            color: [
                this.texturesBack.rayTransform,
                this.texturesBack.rayProperties,
                this.texturesBack.rayColor,
                this.texturesBack.hitPoint
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

        /* draw to screen */
        regl.clear({color: [0,0.3,.2,1]});
    }
}

export default GLRaytracer;