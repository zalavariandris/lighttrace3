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


class GLRaytracer{
    constructor(canvas)
    {
        this.canvas = canvas;
        this.LightSamples = Math.pow(4,6);//128*128; //Math.pow(4,4);
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
                antialias: true,
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
            extensions: ['OES_texture_float', "OES_texture_half_float"]
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

        this.rayDataFbo = regl.framebuffer({
            color: [this.rayDataTexture],
            depth: false
        });

        this.hitDataTexture = regl.texture({
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

        this.secondaryRayDataFbo = regl.framebuffer({
            color: this.secondaryRayDataTexture,
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
            outputRayDataTexture: this.rayDataTexture
        });

        /* reformat hitpoints to match the rays count */
        this.hitDataTexture({
            width: this.rayDataTexture.width,
            height: this.rayDataTexture.height,
            format: "rgba",
            type: "float"
        });

        /* maps scene data to circles */
        const circleData = Object.entries(scene)
            .filter(([key, entity])=>entity.hasOwnProperty("pos") && entity.hasOwnProperty("shape") && entity.shape.type=="circle")
            .map( ([key, entity])=>[entity.pos.x, entity.pos.y, entity.shape.radius] )

        const MAX_BOUNCE = 9;
        for(let i=0; i<MAX_BOUNCE; i++)
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
            drawLines(regl, {
                linesCount: RaysCount,
                startpoints: this.rayDataTexture,
                endpoints: this.hitDataTexture,
                outputResolution: this.outputResolution,
                viewport: {x: this.viewBox.x, y: this.viewBox.y, width: this.viewBox.w, height: this.viewBox.h},
                linesColor: [1.0,1.0,1.0,100.0/this.LightSamples]
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
                hitDataTexture: this.hitDataTexture,
                outputFramebuffer: this.secondaryRayDataFbo,
                outputResolution: [this.rayDataTexture.width, this.rayDataTexture.height],
            });

            /* Swap Buffers */
            [this.rayDataFbo, this.secondaryRayDataFbo] = [this.secondaryRayDataFbo, this.rayDataFbo];
            [this.rayDataTexture, this.secondaryRayDataTexture] = [this.secondaryRayDataTexture, this.rayDataTexture];
        }
    }
}

export default GLRaytracer;