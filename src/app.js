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

const calcZoom = ([clientWidth, clientHeight], viewBox)=>{
    const clientSize = {w: clientWidth, h: clientHeight}
    return clientSize.w/viewBox.w;

}

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
    const [viewBox, setViewBox] = React.useState( {x:-256, y:0, w:512, h:512});
    const settings = React.useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot);

    const ref = React.useRef(null);

    // adjust viewbox on window resize
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

    // display zoom level
    const svgRef = React.useRef(null)
    const zoom = calcZoom([window.innerWidth, window.innerHeight], viewBox);
    document.documentElement.style.setProperty("--zoom", `${zoom}`);

    // set css zoomlevel variable
    React.useEffect(()=>{
        const zoom = calcZoom([window.innerWidth, window.innerHeight], viewBox);
        document.documentElement.style.setProperty("--zoom", `${zoom}`);
    }, viewBox)

    return h("div", {
        ref: ref, 
        ...props
    },
        h("div", {
            style:{
                position: "fixed",
                top: "0px", 
                right: "0px"
            }
        }, 
            `zoom: ${(zoom*100).toFixed()}%`
        ),

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
                ref:svgRef,
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

    //detect mouse idle
    const timeout = React.useRef();
    React.useEffect(()=>{
        // handler resize
        document.body.classList.add("mouse-idle");
        function onMouseMove(e)
        {
            document.body.classList.remove("mouse-idle");
            if (timeout.current) {
                window.clearTimeout(timeout.current);
            }
            timeout.current = window.setTimeout(()=>{
                document.body.classList.add("mouse-idle");
            }, 0)
            
        }
        window.addEventListener("mousemove", onMouseMove);
        return ()=>{
            window.removeEventListener("mousemove", onMouseMove);
        }
    }, []);

    return h("div", {},
        h(Viewport,  {id: "viewport"}),

        settings.debug?h("div", {
            id: "leftSidebar"
        },
            h(Outliner),
            h("hr"),
            h("div", {className: "toolbar vertical"},
                Object.keys(settings.display).map(something=>{
                    return h("label", null,
                        h("input", {
                            checked: settings.display[something],
                            onChange: e=>settingsStore.setValue(`display.${something}`, e.target.checked),
                            type: "checkbox"
                        }),
                        `show ${something}`
                    )
                }),
                h("button", {
                    onMouseDown: e=>{
                        const new_display_settings = {
                            rays: settings.display.glrays,
                            hitSpans: settings.display.glhitspans,
                            normals: settings.display.glnormals,
                            paths: settings.display.glpaths,
                            glrays: settings.display.rays,
                            glhitspans: settings.display.hitSpans,
                            glnormals: settings.display.normals,
                            glpaths: settings.display.paths
                        }
                        for(let [key, value] of Object.entries(new_display_settings)){
                            settingsStore.setValue(`display.${key}`, value);
                        }
                        
                    }
                }, "swap svg and webgl"),
                h("button", {
                    onMouseDown: e=>settingsStore.reset()
                }, "reset settings"),

            )
        ):null,

        h("div", {
            id: "topbar",
            style: {display: "flex", flexDirection: "column"}
        },
            h("div", {style: {display: "flex", gap:".5rem"}},
                h("progress", {
                    value: stats.renderedPasses/settings.raytrace.targetPasses
                }),
                h("span", null, `${stats.renderedPasses} / ${settings.raytrace.targetPasses}`),
            ),
            
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
