import entityStore from "../stores/entity-store.js"
import settingsStore from "../stores/settings-store.js";
import statsStore from "../stores/stats-store.js";
import React from "react";
import GLRaytracer from "../raytracers/gl-raytracer/GLRaytracer-multipass.js";

const h = React.createElement;

function GLViewport({
    width, 
    height, 
    className, 
    viewBox, 
    style,
    ...props
})
{
    const scene = React.useSyncExternalStore(entityStore.subscribe, entityStore.getSnapshot);
    const settings = React.useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot);

    const canvasRef = React.useRef(null);
    const renderer = React.useRef(null);

    // Setup GLRaytracer
    React.useEffect(()=>{
        renderer.current = new GLRaytracer(canvasRef.current);
        renderer.current.initGL();

        // handler resize
        function onResize(e)
        {
            renderer.current.resizeGL();
        }
        onResize()
        window.addEventListener("resize", onResize);
        return ()=>{
            window.removeEventListener("resize", onResize);
        }
    }, []);

    // Progressive Raytrace on AnimationFRame
    const requestId = React.useRef();
    const render = (timestamp) => {
        statsStore.incrementPasses();
        renderer.current.renderPass(scene, viewBox);

        if(statsStore.getSnapshot().renderedPasses<settings.raytrace.targetPasses)
        {
            requestId.current = requestAnimationFrame(render);
        }
        
    };

    React.useEffect(() => {
        renderer.current.clear();
        renderer.current.settings = {
            lightSamples: settings.raytrace.lightSamples,
            maxBounce: settings.raytrace.maxBounce  
        };

        renderer.current.display = {
            rays: settings.display.glrays,
            hitSpans: settings.display.glhitspans,
            normals: settings.display.glnormals,
            paths: settings.display.glpaths
        };

        statsStore.setValue("renderedPasses", 0);
        requestId.current = requestAnimationFrame(render);
        return () => {
            cancelAnimationFrame(requestId.current);
        };
    }, [scene, viewBox, settings]);

    React.useEffect(()=>{
        console.log("settings changed")
    }, [settings])


    // Render Elements
    return h("canvas", {
        className, 
        style: {
            ...style
        },
        ref: canvasRef, 
        ...props
    });
}


export default GLViewport;