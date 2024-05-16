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
function makeCircleFromThreePoints(S, M, E, {material}={}) {
    var Sx = S.x;
    var Sy = S.y;
    var Mx = M.x;
    var My = M.y;
    var Ex = E.x;
    var Ey = E.y;
  
    var a = Sx * (My - Ey) - Sy * (Mx - Ex) + Mx * Ey - Ex * My;
  
    var b = (Sx * Sx + Sy * Sy) * (Ey - My) 
          + (Mx * Mx + My * My) * (Sy - Ey)
          + (Ex * Ex + Ey * Ey) * (My - Sy);
   
    var c = (Sx * Sx + Sy * Sy) * (Mx - Ex) 
          + (Mx * Mx + My * My) * (Ex - Sx) 
          + (Ex * Ex + Ey * Ey) * (Sx - Mx);
   
    var Cx = -b / (2 * a);
    var Cy = -c / (2 * a);
  
    return {
        Cx:Cx, 
        Cy:Cy, 
        material:material, 
        radius: Math.hypot(Cx - Sx, Cy - Sy)
    };
  }
function arcFromThreePoints({Sx, Sy, Mx, My, Ex, Ey})
{
    const circle = makeCircleFromThreePoints({x:Sx, y:Sy}, {x:Mx, y:My}, {x:Ex, y:Ey})
    const r = circle.radius;
    const [SEx, SEy] = [Ex - Sx, Ey - Sy];
    const [SMx, SMy] = [Mx - Sx, My - Sy];
    const crossProduct = SEx * SMy - SEy * SMx;
    const side = crossProduct>0 ? 0 : 1; // 0: Left, 1:right
    return `M ${Sx} ${Sy} `+
    `a ${Math.abs(r)} ${Math.abs(r)} 0 0 ${side} ${Ex-Sx} ${Ey-Sy} `;
}

const makePathFromLens = ({cx,cy,diameter,edgeThickness, centerThickness})=>{
    return ""+
    arcFromThreePoints({
        Sx: cx-edgeThickness/2, 
        Sy: cy-diameter/2,
        Mx: cx-centerThickness/2,
        My: cy,
        Ex: cx-edgeThickness/2, 
        Ey: cy+diameter/2
    })+
    `L ${cx+edgeThickness/2} ${cy+diameter/2}`+
    arcFromThreePoints({
        Sx: cx+edgeThickness/2, 
        Sy: cy+diameter/2,
        Mx: cx+centerThickness/2,
        My: cy,
        Ex: cx+edgeThickness/2, 
        Ey: cy-diameter/2
    })+
    `L ${cx-edgeThickness/2} ${cy-diameter/2}` // this should work with close path 'Z'
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
                                style: {
                                    transform: `rotate(${entity.transform.rotate}rad)`,
                                    transformOrigin: `${entity.transform.translate.x}px ${entity.transform.translate.y}px`
                                }
                            })
                        )
                    case "sphericalLens":
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
                            h("path", {
                                className: "shape",
                                d: makePathFromLens({
                                    cx: entity.transform.translate.x, 
                                    cy: entity.transform.translate.y, 
                                    diameter: entity.shape.diameter, 
                                    edgeThickness: entity.shape.edgeThickness, 
                                    centerThickness: entity.shape.centerThickness,
                                    style: {
                                        transform: `rotate(${entity.transform.rotate}rad)`,
                                        transformOrigin: `${entity.transform.translate.x}px ${entity.transform.translate.y}px`
                                    }
                                }),
                                className: "shape",
                            }),
                            h(Manipulator, {
                                onDrag: e=>entityStore.updateComponent(key, "shape", {
                                   centerThickness:  Math.max(0, Math.min((e.sceneX-entity.transform.translate.x)*2, entity.shape.diameter))
                                }),
                                className:"gizmo"
                            }, h('circle', {
                                className: "handle",
                                cx:entity.transform.translate.x+entity.shape.centerThickness/2, 
                                cy:entity.transform.translate.y,
                                r: 5,
                                vectorEffect: "non-scaling-stroke",
                                style: {cursor: "ew-resize"}
                            })),
                            h(Manipulator, {
                                className:"manip",
                                onDrag: e=>{
                                    const newEdgeThickness = Math.max(1, (e.sceneX-entity.transform.translate.x)*2);
                                    entityStore.updateComponent(key, "shape", {
                                        edgeThickness: newEdgeThickness,
                                        centerThickness: Math.max(1, newEdgeThickness-entity.shape.edgeThickness + entity.shape.centerThickness),
                                        diameter: Math.max(1, (e.sceneY-entity.transform.translate.y)*2)       
                                    });
                                }
                            }, h('circle', {
                                className: "gizmo",
                                cx:entity.transform.translate.x+entity.shape.edgeThickness/2, 
                                cy:entity.transform.translate.y+entity.shape.diameter/2,
                                r: 5,
                                vectorEffect: "non-scaling-stroke",
                                style: {cursor: "nwse-resize"}
                            })),
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
                        className: "gizmo"
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