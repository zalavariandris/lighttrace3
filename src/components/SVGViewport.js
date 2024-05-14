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

        settings.svgDisplay.shapes?Object.entries(scene).filter(([key, entity])=>entity.hasOwnProperty("shape")).map( ([key, entity])=>{
            return h(Manipulator, {
                referenceX: entity.pos.x,
                referenceY: entity.pos.y,
                onDrag: e=>entityStore.updateComponent(key, "pos", {
                    x: e.sceneX+e.referenceOffsetX, 
                    y: e.sceneY+e.referenceOffsetY
                }),
            }, 
                h("circle", {cx: entity.pos.x, cy: entity.pos.y, r:entity.shape.radius})
            )
        }):null,
        Object.entries(scene)
            .filter(([key, entity])=>entity.hasOwnProperty("pos") && entity.hasOwnProperty("light"))
            .map( ([key, entity])=>{
            return h(Manipulator, {
                referenceX: entity.pos.x,
                referenceY: entity.pos.y,
                onDrag: e=>entityStore.updateComponent(key, "pos", {
                    x: e.sceneX+e.referenceOffsetX, 
                    y: e.sceneY+e.referenceOffsetY
                }),
            }, 
                h("circle", {cx: entity.pos.x, cy: entity.pos.y, r:10, style:{fill:"orange"}})
            )
        })
    );
}

export default SVGViewport;