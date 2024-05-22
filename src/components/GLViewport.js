import entityStore from "../stores/entity-store.js"
import settingsStore from "../stores/settings-store.js";
import statsStore from "../stores/stats-store.js";
import React from "react";


import GLRaytracer from "../raytracers/gl-raytracer/GLRaytracer.js";

const h = React.createElement;

function GLViewport({width, height, className, viewBox, displaySettings, ...props})
{
    const scene = React.useSyncExternalStore(entityStore.subscribe, entityStore.getSnapshot);
    const settings = React.useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot);
    const stats = React.useSyncExternalStore(statsStore.subscribe, statsStore.getSnapshot);

    const canvasRef = React.useRef(null);
    const renderer = React.useRef(null);
    const renderInfo = React.useRef([scene, viewBox]);

    React.useEffect(()=>{
        renderer.current = new GLRaytracer(canvasRef.current);
        renderer.current.initGL();
        renderer.current.onPassRendered((raysCount)=>{
            statsStore.setValue("samplesCount", stats.samplesCount + raysCount)
        })
        renderer.current.resizeGL();

        function onResize(e)
        {
            renderer.current.resizeGL();
        }
        window.addEventListener("resize", onResize);
        return ()=>{
            window.removeEventListener("resize", onResize);
        }
    }, []);

    // const requestId = React.useRef();
    // React.useEffect(() => {
    //     const animate = (timestamp) => {
    //         // Animation code goes here
    //         renderer.current.renderGL(renderInfo.current[0], renderInfo.current[1])
    //         requestId.current = requestAnimationFrame(animate);
    //     };
    //     requestId.current = requestAnimationFrame(animate);
    //     return () => {
    //         cancelAnimationFrame(requestId.current);
    //     };
    // }, []);

    React.useEffect(()=>{
        renderInfo.current = [scene, viewBox];
        renderer.current.renderGL(renderInfo.current[0], renderInfo.current[1])
    }, [scene, viewBox]);

    React.useEffect(()=>{
        Object.assign(renderer.current.settings, settings.raytrace);
        renderer.current.renderGL(renderInfo.current[0], renderInfo.current[1])
    }, [settings]);


    return h("canvas", {
        className, 
        ref: canvasRef, 
        ...props});
}

export default GLViewport;