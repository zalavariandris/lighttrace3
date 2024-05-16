import createREGL from "regl"

/*
 * GL Renderer
 */
import castRaysFromLights from "./operators/castRaysFromLights.js";
import { drawTexture } from "./operators/drawTexture.js";
import { drawCSGToSDF } from "./operators/drawCSGToSDF.js";
import { intersectRaysWithSDF } from "./operators/intersectRaysWithSDF.js";
import { drawLines} from "./operators/drawLines.js";
import { drawRays} from "./operators/drawRays.js"

import { wavelengthToColor } from "./operators/wavelengthToColor.js";
import QUAD from "./QUAD.js"
import { loadShader } from "./shaders/load-shader.js"
const PASS_THROUGH_VERTEX_SHADER = await loadShader("./src/gl-renderer/shaders/PASS_THROUGH_VERTEX_SHADER.fs");
const intersectRaysWithCSGShader = await loadShader("./src/gl-renderer/shaders/intersectRaysWithCSG.fs");
const bounceRaysShader = await loadShader("./src/gl-renderer/shaders/bounceRays.fs")
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


class GLRaytracer{
    constructor(canvas)
    {
        this.canvas = canvas;
        this.LightSamples = Math.pow(4,5);//128*128; //Math.pow(4,4);
        this.MAX_BOUNCE = 6;
        this.viewBox = {x: 0, y: 0, w: 512, h: 512};
        this.outputResolution = [512, 512];
    }

    initGL()
    {
        // console.log("init gl", this.outputResolution)
        this.initRegl();
        this.initTextures();
        this.initFramebuffers();
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
                preserveDrawingBuffer: true,
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
                'webgl_draw_buffers', // multiple render targets
                'OES_texture_float'
            ]
        });
    }

    initTextures()
    {
        const lightsCount = 2;
        const RaysCount = this.LightSamples * lightsCount;
        const dataTextureRadius = Math.ceil(Math.sqrt(RaysCount));

        const regl = this.regl;

        this.spectralTexture = regl.texture({
            data: spectralImage.data,
            flipY:false,
            width: spectralImage.width, 
            height: spectralImage.height,
            wrap: 'clamp',
            format: "rgba",
            type: "uint8"
        });



        this.rayDataTexture = regl.texture({
            width: dataTextureRadius,
            height: dataTextureRadius,
            wrap: 'clamp',
            min: "nearest", 
            mag: "nearest",
            format: "rgba",
            type: "float",
        });

        this.secondaryRayDataTexture = regl.texture({
            width: dataTextureRadius,
            height: dataTextureRadius,
            wrap: 'clamp',
            min: "nearest", 
            mag: "nearest",
            format: "rgba",
            type: "float",
        });

        this.hitDataTexture = regl.texture({
            width: dataTextureRadius, 
            height: dataTextureRadius,
            wrap: 'clamp',
            format: "rgba",
            type: "float"
        });

        this.lightDataTexture = regl.texture({
            width: dataTextureRadius,
            height: dataTextureRadius,
            wrap: 'clamp',
            min: "nearest", 
            mag: "nearest",
            format: "rgba",
            type: "float",
        });

        this.rayColorsDataTexture = regl.texture({
            width: dataTextureRadius,
            height: dataTextureRadius,
            wrap: 'clamp',
            min: "nearest", 
            mag: "nearest",
            format: "rgba",
            type: "float",
        });

        this.hitMaterialTexture = regl.texture({
            width: dataTextureRadius, 
            height: dataTextureRadius,
            wrap: 'clamp',
            format: "rgba",
            type: "float"
        });

        this.secondaryLightDataTexture = regl.texture({
            width: dataTextureRadius,
            height: dataTextureRadius,
            wrap: 'clamp',
            min: "nearest", 
            mag: "nearest",
            format: "rgba",
            type: "float",
        });
    }

    initFramebuffers()
    {
        const regl = this.regl;
        // Framebuffers
        this.rayDataFbo = regl.framebuffer({
            color: [
                this.rayDataTexture,
                this.lightDataTexture   
            ],
            depth: false
        });

        this.rayColorFbo = regl.framebuffer({
            color: this.rayColorsDataTexture,
            depth: false
        });

        this.hitDataFbo = regl.framebuffer({
            color: this.hitDataTexture,
            depth: false
        });

        this.secondaryRayDataFbo = regl.framebuffer({
            color: [
                this.secondaryRayDataTexture, 
                this.secondaryLightDataTexture
            ],
            depth: false
        });
    }

    resizeGL()
    {
        const [width, height] = [this.canvas.clientWidth, this.canvas.clientHeight];
        this.canvas.width = width;
        this.canvas.height = height;
        this.outputResolution = [width, height]
        // console.log("resizeGL", this.outputResolution);
    }

    setViewBox(viewBox){
        this.viewBox = viewBox;
    }

    renderGL(scene)
    {
        // console.log("renderGL", this.outputResolution)
        const regl = this.regl;

        const backgroundLightness = 0.03;

        /* filter entities to lights */
        const lightEntities = Object.entries(scene)
            .filter( ([key, entity])=>entity.hasOwnProperty("light") )

        /* Cast Rays from lightsources */
        const RaysCount = castRaysFromLights({
            lightSamples: this.LightSamples,
            lightEntities: lightEntities,
            outputRayDataTexture: this.rayDataTexture,
            outputLightDataTexture: this.lightDataTexture
        });

        // resize compute FBO to contain all rays
        const dataTextureRadius = Math.ceil(Math.sqrt(RaysCount));
        this.rayDataFbo.resize(dataTextureRadius);
        this.secondaryRayDataFbo.resize(dataTextureRadius);
        this.hitDataFbo.resize(dataTextureRadius);
        this.rayColorFbo.resize(dataTextureRadius);


        /* make light wavelength to color */
        wavelengthToColor(regl, {
            outputFramebuffer: this.rayColorFbo,
            outputResolution: [this.rayColorFbo.width, this.rayColorFbo.height],
            lightDataTexture: this.lightDataTexture,
            spectralTexture: this.spectralTexture
        });

        /* maps scene data to circles */
        const circleData = Object.entries(scene)
            .filter(([key, entity])=>entity.hasOwnProperty("transform") && entity.hasOwnProperty("shape") && entity.shape.type=="circle")
            .map( ([key, entity])=>[entity.transform.translate.x, entity.transform.translate.y, entity.shape.radius] )


        regl.clear({color: [backgroundLightness,backgroundLightness,backgroundLightness,1.0]});
        for(let i=0; i<this.MAX_BOUNCE; i++)
        {

            /* INTERSECT RAYS WITH CSG */
            regl({...QUAD, vert:PASS_THROUGH_VERTEX_SHADER,
                framebuffer: this.hitDataFbo,
                uniforms: {
                    rayDataTexture: this.rayDataTexture,
                    rayDataResolution: [this.rayDataTexture.width, this.rayDataTexture.height],
                    circleData: circleData.flat(),
                    circleCount: circleData.length
                },
                frag: intersectRaysWithCSGShader
            })();

            /* Bounce rays with hitPoints */
            regl({...QUAD, vert: PASS_THROUGH_VERTEX_SHADER,
                framebuffer: this.secondaryRayDataFbo,
                uniforms:{
                    outputResolution: [this.rayDataTexture.width, this.rayDataTexture.height],
                    incidentRaysTexture: this.rayDataTexture,
                    rayDataResolution: [this.rayDataTexture.width, this.rayDataTexture.height],
                    incidentLightsTexture: this.lightDataTexture,
                    hitDataTexture: this.hitDataTexture,
                    hitDataResolution: [this.hitDataTexture.width, this.hitDataTexture.height]
                },
                frag:bounceRaysShader
            })()

            
            drawLines(regl, {
                linesCount: RaysCount,
                startpoints: this.rayDataTexture,
                endpoints: this.hitDataTexture,
                colors: this.rayColorsDataTexture,
                outputResolution: this.outputResolution,
                viewport: {x: this.viewBox.x, y: this.viewBox.y, width: this.viewBox.w, height: this.viewBox.h},
            });

            // /* Swap Buffers */
            [this.rayDataFbo, this.secondaryRayDataFbo] = [this.secondaryRayDataFbo, this.rayDataFbo];
            [this.rayDataTexture, this.secondaryRayDataTexture] = [this.secondaryRayDataTexture, this.rayDataTexture];
            [this.lightDataTexture, this.secondaryLightDataTexture] = [this.secondaryLightDataTexture, this.lightDataTexture];
        }
    }
}

export default GLRaytracer;