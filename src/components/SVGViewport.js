import React from "react";

import entityStore from "../stores/entity-store.js";
import uiStore from "../stores/ui-store.js";
import settingsStore from "../stores/settings-store.js";

import Manipulator, {RotateManip} from "../UI/Manipulators.js";
const h = React.createElement;
import SVGRaytracer from "../raytracers/svg-raytracer/SVGRaytracer.js";
import {selectAndMoveTool, circleTool, rectangleTool, triangleTool, lineTool, lensTool, pointlightTool, directionalLightTool, laserTool} from "./MouseTools.js"
import _ from "lodash";
import Icon from "./icons/icon.js";

/* import shapes */
import Circle from "../UI/shapes/circle.js"
import Lens from "../UI/shapes/lens.js"
import Line from "../UI/shapes/line.js"
import Rectangle from "../UI/shapes/rectangle.js"
import Triangle from "../UI/shapes/triangle.js"

/* import lights */
import LaserLight from "../UI/lights/laser-light.js"
import PointLight from "../UI/lights/point-light.js"
import DirectionalLight from "../UI/lights/directional-light.js"

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
    const uiState = React.useSyncExternalStore(uiStore.subscribe, uiStore.getSnapshot);

    // pan and zoom
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

    const handleMouseTools = e=>{
        switch (uiState.activeMouseTool) {
            case "circle":
                circleTool(e);
                break;
            case "rectangle":
                rectangleTool(e);
                break;
            case "triangle":
                triangleTool(e);
                break;
            case "line":
                lineTool(e);
                break;
            case "lens":
                lensTool(e);
                break;
            case "pointLight":
                pointlightTool(e);
                break;
            case "laser":
                laserTool(e);
                break;
            case "directional":
                directionalLightTool(e);
                break;
                
        
            default:
                panViewport(e)
                break;
        }
        
    }

    return h("svg", {
        width, 
        height, 
        className,
        viewBox: viewboxString(viewBox),
        ...props,
        onMouseDown: (e)=>handleMouseTools(e),
        onWheel: (e) => zoomViewportWithmouseWheel(e),
        onClick: (e)=>{
            if(e.target.tagName=='svg') // TODO test against itself
            {
                entityStore.setSelection([])
            }
        }
    }, 

        h("defs", null,
            h("marker", {
                id:"arrow",
                viewBox:"0 0 10 10",
                refX:"1",
                refY:"5",
                markerWidth:"3",
                markerHeight:"3",
                orient:"auto-start-reverse"
            },
                h("path", {
                    d: "M 0 0 L 5 5 L 0 10 z", // This path represents an arrow
                    fill: "white"
                })
            )
        ),

        // SHAPES
        h("g", {
            className:"shapes", 
            style:{
                opacity: settings.display.shapes ? 1.0 : 0.0
            }
        },
            Object.entries(scene)
            .filter(([key, entity])=>{
                return entity.hasOwnProperty("shape") && entity.hasOwnProperty("transform");
            })
            .map( ([key, entity])=>{
                switch (entity.shape.type) {
                    case "circle":
                        return h(Circle, {
                            id: key,
                            className: entity.selected ? "shape selected" : "shape",
                            cx: entity.transform.translate.x,
                            cy: entity.transform.translate.y,
                            r: entity.shape.radius,
                            onClick: e=>entityStore.setSelection([key]),
                            onChange: e=>{
                                entityStore.setValue(`${key}.transform.translate`, {
                                    x: e.value.cx, 
                                    y: e.value.cy
                                });
                                entityStore.setValue(`${key}.shape.radius`, e.value.r);
                            }
                        })
                    case "rectangle":
                        return h(Rectangle, {
                            id: key,
                            entityKey: key, 
                            entity: entity,
                            onClick: e=>entityStore.setSelection([key]),
                        })
                    case "sphericalLens":
                        return h(Lens, {
                            entityKey: key, 
                            entity: entity,
                            onClick: e=>entityStore.setSelection([key]),
                            id: key
                        })
                    case "triangle":
                        return h(Triangle, {
                            entityKey: key, 
                            entity: entity,
                            onClick: e=>entityStore.setSelection([key]),
                            id: key
                        })
                    case "line":
                        return h(Line, {
                            entityKey: key, 
                            entity: entity,
                            onClick: e=>entityStore.setSelection([key]),
                            id: key
                        })
                    default:
                        break;
                }

            })
        ),

        // LIGHTS
        h("g", {
            className:"lights", 
            style:{
                opacity: settings.display.lights ? 1.0 : 0.0
            }
        },
            Object.entries(scene)
            .filter(([key, entity])=>entity.hasOwnProperty("transform") && entity.hasOwnProperty("light"))
            .map( ([key, entity])=>{
                switch (entity.light.type) {
                    case "point":
                        return h(PointLight, {entityKey: key, entity: entity})
                    case "laser":
                        return h(LaserLight, {entityKey: key, entity: entity})
                    case "directional":
                        return h(DirectionalLight, {entityKey: key, entity: entity})
                
                    default:
                        break;
                }

            })
        ),

        // RAYS
        h(SVGRaytracer)
    );
}

export default SVGViewport;