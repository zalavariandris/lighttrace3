import entityStore from "../stores/entity-store.js"
import settingsStore from "../stores/settings-store.js";
import React from "react";
import Manipulator from "../widgets/Manipulator.js";
const h = React.createElement;


// UTILS
function viewboxString(viewBox)
{
    return viewBox.x+" "+viewBox.y+" "+viewBox.w+" "+viewBox.h;
}
    

const calcScale = (svg, viewBox)=>{
    // const svg = svgRef.current;
    if(svg)
    {
        const clientSize = {w: svg.clientWidth, h: svg.clientHeight}
        return viewBox.w/clientSize.w;
    }else{
        return 1.0;
    }
}


function SVGViewport({width, height, className, viewBox, onViewBoxChange, ...props})
{
    const scene = React.useSyncExternalStore(entityStore.subscribe, entityStore.getSnapshot);
    const settings = React.useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot);

    const panViewport = (e)=>{ 
        if(e.defaultPrevented){
            return;
        }

        const panBegin = {x: e.clientX, y: e.clientY};
        const svg = e.target.closest("SVG");

        const handleDrag = (e)=>{
            if(e.defaultPrevented){
                return;
            }

            const clientSize = {w: svg.clientWidth, h: svg.clientHeight}
            let current_scale = clientSize.w/viewBox.w;
            
            var dx = -(e.clientX-panBegin.x)/current_scale;
            var dy = -(e.clientY-panBegin.y)/current_scale;
            
            var newViewBox = {
                x:viewBox.x+dx,
                y:viewBox.y+dy,
                w:viewBox.w,
                h:viewBox.h
            };
    
            onViewBoxChange(newViewBox)
        }
    
        window.addEventListener('mousemove', handleDrag);
        window.addEventListener('mouseup', ()=>window.removeEventListener("mousemove", handleDrag), {once: true});
    }

    // event handling
    const zoomViewportWithmouseWheel = (e)=>{
        const svg = e.target.closest("SVG");
        const clientSize = {w: svg.clientWidth, h: svg.clientHeight}
        var w = viewBox.w;
        var h = viewBox.h;
        var mx = e.clientX;//mouse x  
        var my = e.clientY;
        var dw = w*e.deltaY*0.01*-0.05;
        var dh = h*e.deltaY*0.01*-0.05; 
        var dx = dw*mx/clientSize.w;
        var dy = dh*my/clientSize.h;
        const newViewBox = {
            x:viewBox.x+dx,
            y:viewBox.y+dy,
            w:viewBox.w-dw,
            h:viewBox.h-dh
        }

        onViewBoxChange(newViewBox)
    }
    return h("svg", {
        width, 
        height, 
        className,
        viewBox: viewboxString(viewBox),
        ...props,
        onMouseDown: (e)=>panViewport(e),
        onWheel: (e) => zoomViewportWithmouseWheel(e)   
    }, 

        // SHAPES
        Object.entries(scene)
            .filter(([key, entity])=>{
                return entity.hasOwnProperty("shape") && entity.hasOwnProperty("transform");
            })
            .map( ([key, entity])=>{
                switch (entity.shape.type) {
                    case "circle":
                        return h(Manipulator, {
                            referenceX: entity.transform.translate.x,
                            referenceY: entity.transform.translate.y,
                            onDrag: e=>entityStore.updateComponent(key, "transform", {
                                translate: {
                                    x: e.sceneX+e.referenceOffsetX, 
                                    y: e.sceneY+e.referenceOffsetY
                                }
                            }),
                        }, 
                            h("circle", {
                                className: "shape",
                                cx: entity.transform.translate.x, 
                                cy: entity.transform.translate.y, 
                                r:entity.shape.radius
                            })
                        )
                    case "rectangle":
                        return h(Manipulator, {
                            referenceX: entity.transform.translate.x,
                            referenceY: entity.transform.translate.y,
                            onDrag: e=>entityStore.updateComponent(key, "transform", {
                                translate: {
                                    x: e.sceneX+e.referenceOffsetX, 
                                    y: e.sceneY+e.referenceOffsetY
                                }
                            }),
                        }, 
                            h("rect", {
                                className: "shape",
                                x: entity.transform.translate.x-entity.shape.width/2, 
                                y: entity.transform.translate.y-entity.shape.height/2, 
                                width: entity.shape.width,
                                height: entity.shape.height,
                            })
                        )
                    default:
                        break;
                }

            }),

        // LIGHTS
        Object.entries(scene)
            .filter(([key, entity])=>entity.hasOwnProperty("transform") && entity.hasOwnProperty("light"))
            .map( ([key, entity])=>{
                return h(Manipulator, {
                    referenceX: entity.transform.translate.x,
                    referenceY: entity.transform.translate.y,
                    onDrag: e=>entityStore.updateComponent(key, "transform", {
                        translate: {
                            x: e.sceneX+e.referenceOffsetX, 
                            y: e.sceneY+e.referenceOffsetY
                        }
                    }),
                }, 
                    h("circle", {
                        cx: entity.transform.translate.x, 
                        cy: entity.transform.translate.y, 
                        r:10, 
                        style:{
                            fill:"orange"
                        }
                    }),

                    h(Manipulator, {
                        referenceX: entity.transform.translate.x+Math.cos(entity.transform.rotate)*50,
                        referenceY: entity.transform.translate.y+Math.sin(entity.transform.rotate)*50,
                        onDrag: e=>entityStore.updateComponent(key, "transform", {
                            rotate: Math.atan2(e.sceneY-entity.transform.translate.y, e.sceneX-entity.transform.translate.x)
                        })
                    }, h("circle", {
                        cx: entity.transform.translate.x+Math.cos(entity.transform.rotate)*50, 
                        cy: entity.transform.translate.y+Math.sin(entity.transform.rotate)*50, 
                        r:10,
                        className: "gizmo"
                    }),)
                )
            })
    );
}

export default SVGViewport;