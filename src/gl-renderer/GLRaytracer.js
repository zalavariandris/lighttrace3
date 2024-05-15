import createREGL from "regl"

/*
 * GL Renderer
 */
import castRaysFromLights from "./operators/castRaysFromLights.js";
import { drawTexture } from "./operators/drawTexture.js";
import { drawCSGToSDF } from "./operators/drawCSGToSDF.js";
import { intersectRaysWithCSG } from "./operators/intersectRaysWithCSG.js"
import { intersectRaysWithSDF } from "./operators/intersectRaysWithSDF.js";
import { drawLines} from "./operators/drawLines.js";
import { drawRays} from "./operators/drawRays.js"
import { bounceRays } from "./operators/bounceRays.js";
import { wavelengthToColor } from "./operators/wavelengthToColor.js";

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
        const regl = this.regl;

        this.sdfTexture = regl.texture({
            width: 512, 
            height: 512,
            wrap: 'clamp',
            format: "rgba",
            type: "float"
        });

        this.sdfFbo = regl.framebuffer({
            color: this.sdfTexture,
            depth: false
        });

        this.rayDataTexture = regl.texture({
            width: Math.sqrt(this.LightSamples),
            height: Math.sqrt(this.LightSamples),
            wrap: 'clamp',
            min: "nearest", 
            mag: "nearest",
            format: "rgba",
            type: "float",
        });

        this.lightDataTexture = regl.texture({
            width: Math.sqrt(this.LightSamples),
            height: Math.sqrt(this.LightSamples),
            wrap: 'clamp',
            min: "nearest", 
            mag: "nearest",
            format: "rgba",
            type: "float",
        });

        this.rayDataFbo = regl.framebuffer({
            color: [
                this.rayDataTexture,
                this.lightDataTexture   
            ],
            depth: false
        });

        this.colorsTexture = regl.texture({
            width: Math.sqrt(this.LightSamples),
            height: Math.sqrt(this.LightSamples),
            wrap: 'clamp',
            min: "nearest", 
            mag: "nearest",
            format: "rgba",
            type: "float",
        });

        this.rayColorFbo = regl.framebuffer({
            color: this.colorsTexture,
            depth: false
        });

        console.log(spectralImage)

        
        this.spectralTexture = regl.texture({
            data: spectralImage.data,
            flipY:false,
            width: spectralImage.width, 
            height: spectralImage.height,
            wrap: 'clamp',
            format: "rgba",
            type: "uint8"
        });


        this.hitDataTexture = regl.texture({
            width: Math.sqrt(this.LightSamples), 
            height: Math.sqrt(this.LightSamples),
            wrap: 'clamp',
            format: "rgba",
            type: "float"
        });

        this.hitMaterialTexture = regl.texture({
            width: Math.sqrt(this.LightSamples), 
            height: Math.sqrt(this.LightSamples),
            wrap: 'clamp',
            format: "rgba",
            type: "float"
        });

        this.hitDataFbo = regl.framebuffer({
            color: this.hitDataTexture,
            depth: false
        });

        this.secondaryRayDataTexture = regl.texture({
            width: Math.sqrt(this.LightSamples),
            height: Math.sqrt(this.LightSamples),
            wrap: 'clamp',
            min: "nearest", 
            mag: "nearest",
            format: "rgba",
            type: "float",
        });

        this.secondaryLightDataTexture = regl.texture({
            width: Math.sqrt(this.LightSamples),
            height: Math.sqrt(this.LightSamples),
            wrap: 'clamp',
            min: "nearest", 
            mag: "nearest",
            format: "rgba",
            type: "float",
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

        const lightness = 0.03;
        regl.clear({color: [lightness,lightness,lightness,1.0]});

        this.sdfTexture = regl.texture({
            width: this.canvas.width, 
            height: this.canvas.height,
            wrap: 'clamp',
            format: "rgba",
            type: "float"
        });

        // drawCSGToSDF(regl, {
        //     framebuffer: this.sdfFbo,
        //     CSG: circleData,
        //     outputResolution: [this.canvas.width, this.canvas.height]
        // });
        
        // drawTexture(regl, {
        //     framebuffer: null,
        //     texture: this.sdfTexture, 
        //     outputResolution: [this.canvas.width, this.canvas.height],
        //     exposure: 0.001
        // });

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

        /* reformat hitpoints to match the rays count */
        this.hitDataTexture({
            width: this.rayDataTexture.width,
            height: this.rayDataTexture.height,
            format: "rgba",
            type: "float"
        });

        this.colorsTexture({
            width: this.rayDataTexture.width,
            height: this.rayDataTexture.height,
            format: "rgba",
            type: "float"
        });

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

        
        for(let i=0; i<this.MAX_BOUNCE; i++)
        {
            // /* Draw initial Rays */
            // drawRays(regl, {
            //     raysCount: RaysCount,
            //     raysTexture: this.rayDataTexture,
            //     raysLength: 100.0,
            //     outputResolution: this.outputResolution,
            //     viewport: {x: this.viewBox.x, y: this.viewBox.y, width: this.viewBox.w, height: this.viewBox.h},
            //     raysColor: [1,1,0,1]
            // });

            intersectRaysWithCSG(regl, {
                incidentRayDataTexture: this.rayDataTexture,
                CSG: circleData,
                framebuffer: this.hitDataFbo
            });

            // intersectRaysWithSDF(regl, {
            //     incidentRayDataTexture: this.rayDataTexture,
            //     sdfTexture: this.sdfTexture,
            //     framebuffer: this.hitDataFbo
            // });

            /* Draw RAYS to hitPoints */

            // this.rayColorFbo.resize({
            //     width: this.rayDataTexture.width,
            //     height: this.rayDataTexture.height,
            // });
            drawLines(regl, {
                linesCount: RaysCount,
                startpoints: this.rayDataTexture,
                endpoints: this.hitDataTexture,
                colors: this.colorsTexture,
                outputResolution: this.outputResolution,
                viewport: {x: this.viewBox.x, y: this.viewBox.y, width: this.viewBox.w, height: this.viewBox.h},
            });

            /* Draw hitPoints */
            // drawRays(regl, {
            //     raysCount: RaysCount,
            //     raysTexture: this.hitDataFbo,
            //     raysLength: 30.0,
            //     outputResolution: this.outputResolution,
            //     viewport: {x: this.viewBox.x, y: this.viewBox.y, width: this.viewBox.w, height: this.viewBox.h},
            //     raysColor: [0,1,0,1]
            // });

            /* Bounce rays with hitPoints */
            bounceRays(regl, {
                incidentRaysTexture: this.rayDataTexture, 
                incidentLightDataTexture: this.lightDataTexture,
                hitDataTexture: this.hitDataTexture,
                outputFramebuffer: this.secondaryRayDataFbo,
                outputResolution: [this.rayDataTexture.width, this.rayDataTexture.height],
            });

            /* Swap Buffers */
            [this.rayDataFbo, this.secondaryRayDataFbo] = [this.secondaryRayDataFbo, this.rayDataFbo];
            [this.rayDataTexture, this.secondaryRayDataTexture] = [this.secondaryRayDataTexture, this.rayDataTexture];
            [this.lightDataTexture, this.secondaryLightDataTexture] = [this.secondaryLightDataTexture, this.lightDataTexture];
        }
    }
}

export default GLRaytracer;