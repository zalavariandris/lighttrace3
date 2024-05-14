import entityStore from "../entity-store.js"
import React from "react";
const h = React.createElement;

import GLRenderer from "../gl-renderer/GLRenderer.js"

function GLViewport({width, height, className, ...props})
{
    const scene = React.useSyncExternalStore(entityStore.subscribe, entityStore.getSnapshot);
    const canvasRef = React.useRef(null);
    const renderer = React.useRef(null);

    React.useEffect(()=>{
        renderer.current = new GLRenderer(canvasRef.current);
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

    return h("canvas", {width, height, className, ref: canvasRef, ...props});
}

export default GLViewport;