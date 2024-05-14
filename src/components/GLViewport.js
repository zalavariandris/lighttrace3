import entityStore from "../stores/entity-store.js"
import React from "react";
const h = React.createElement;

import GLRaytracer from "../gl-renderer/GLRaytracer.js"

function GLViewport({width, height, className, viewBox, displaySettings, ...props})
{
    const scene = React.useSyncExternalStore(entityStore.subscribe, entityStore.getSnapshot);
    const canvasRef = React.useRef(null);
    const renderer = React.useRef(null);

    React.useEffect(()=>{
        renderer.current = new GLRaytracer(canvasRef.current);
        renderer.current.initGL();
        renderer.current.resizeGL();

        function onResize(e)
        {
            renderer.current.resizeGL();
            renderer.current.renderGL(scene);
        }
        window.addEventListener("resize", onResize);
        return ()=>{
            window.removeEventListener("resize", onResize);
        }
    }, []);

    React.useEffect(()=>{
        renderer.current.renderGL(scene);
    }, [scene])

    React.useEffect(()=>{
        renderer.current.setViewBox(viewBox);
        renderer.current.renderGL(scene);
    }, [viewBox]);

    return h("canvas", {className, ref: canvasRef, ...props});
}

export default GLViewport;