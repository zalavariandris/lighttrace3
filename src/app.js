import React from "react";
import Outliner  from "./components/Outliner.js"

import SVGViewport from "./components/SVGViewport.js";
import GLViewport from "./components/GLViewport.js";
import Toolbar from "./components/Toolbar.js";
import ErrorBoundary from "./components/ErrorBoundary.js"

import entityStore from "./stores/entity-store.js"
import settingsStore from "./stores/settings-store.js";
import statsStore from "./stores/stats-store.js";
const h = React.createElement;


function fitViewboxInSize(viewBox, size)
{
    // adjust viewbox width to match resolution aspect "contain"
    let size_aspect = size.width/size.height;
    let view_aspect = viewBox.w/viewBox.h;
    let newViewBox = viewBox;
    if(size_aspect > view_aspect)
    {
        const new_view_width = viewBox.h * size_aspect;
        newViewBox = {
            x: viewBox.x+(viewBox.w-new_view_width)/2,
            w: new_view_width,
            y: viewBox.y,
            h: viewBox.h
        }
    }
    else
    {
        const new_view_height = viewBox.w / size_aspect;
        newViewBox = {
            x: viewBox.x,
            w: viewBox.w,
            y: viewBox.y+(viewBox.h-new_view_height)/2,
            h: new_view_height
        }
    }

    return newViewBox
}

function Viewport(props)
{
    // sync svg- and glviewport viewbox
    const [viewBox, setViewBox] = React.useState( JSON.parse(localStorage.getItem("viewBox")) || {x:0, y:0, w:512, h:512});
    React.useEffect(()=>{
        localStorage.setItem("viewBox", JSON.stringify(viewBox));
    }, [viewBox]);
    const ref = React.useRef(null);

    React.useEffect( ()=>{
        function resizeHandler(e)
        {
            setViewBox( fitViewboxInSize(viewBox, {width: ref.current.clientWidth, height: ref.current.clientHeight}) );
        }
        setViewBox( fitViewboxInSize(viewBox, {width: ref.current.clientWidth, height: ref.current.clientHeight}) );

        window.addEventListener("resize", resizeHandler);

        return ()=>{
            window.removeEventListener("resize", resizeHandler);
        }
    }, []);

    return h("div", {
        ref: ref, 
        ...props
    },
        h(ErrorBoundary, {
            fallback:h("div", null, "GLViewport error")
        },
            h(GLViewport, {
                viewBox: viewBox,
                style: {
                    position: "absolute", 
                    width: "100%", 
                    height:"100%",
                    pointerEvents: "none",
                    transform: "scale(1, -1) translateZ(0)"   
                }
            })
        ),
        h(ErrorBoundary, {
            fallback:h("div", null, "SVGViewport error")
        },
            h(SVGViewport, {
                viewBox: viewBox,
                preserveAspectRatio: "none",
                onViewBoxChange: viewBox=>setViewBox(viewBox),
                style: {
                    position: "absolute", 
                    width: "100%", 
                    height:"100%",
                    transform: "translateZ(0)"   
                }
            })
        )
    )
}

function App({})
{

    const scene = React.useSyncExternalStore(entityStore.subscribe, entityStore.getSnapshot);
    const selection = Object.fromEntries(Object.entries(scene).filter(([key, entity])=>{
        return entity.selected ? true : false;
    }));

    const settings = React.useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot);
    const stats = React.useSyncExternalStore(statsStore.subscribe, statsStore.getSnapshot);

    return h("div", {},
        h(Viewport,  {id: "viewport"}),

        h("div", {
            id: "topbar",
            style: {display: "flex", flexDirection: "column"}
        },
            h("progress", {
                value: stats.samplesCount/settings.raytrace.targetSamples
            }),
            h("select", {
                onChange: e=>{
                    switch (e.target.value) {
                        case "lenses":
                            entityStore.loadExample("lenses")
                            break;
                        case "prism":
                            entityStore.loadExample("prism")
                            break;
                        case "shapes":
                            entityStore.loadExample("shapes")
                            break;
                        case "lights":
                            entityStore.loadExample("lights")
                            break;
                        case "cornel box":
                            entityStore.loadExample("cornel box")
                            break;
                        default:
                            break;
                    }
                }
            },
                h("option", null, "<examples>"),
                h("option", null, "lenses"),
                h("option", null, "prism"),
                h("option", null, "shapes"),
                h("option", null, "lights"),
                h("option", null, "cornel box")
            )
        ),

        h("div", {id: "bottombar", className: "panel", style: {background: "transparent"}},
            h(ErrorBoundary, {
                fallback: "Toolbar error"
            },
                h(Toolbar)
            )
        )
    );
}

export default App;
