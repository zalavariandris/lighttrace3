import React from "react";
import Manipulator, {RotateManip} from "../Manipulators.js";
const h = React.createElement;

function Triangle({
    cx,cy,angle,size,
    onChange,
    ...props
})
{
    const vertices = Array.from({length: 3}).map((_, k)=>{
        const angle = k/3.0*Math.PI*2-Math.PI/2;
        return [Math.cos(angle)*size, Math.sin(angle)*size];
    });

    const svgPointsString = vertices.map(P=>P.join(", ")).join(" ");
    let prevSize;

    return h("g", {
        ...props
    }, 
        h(Manipulator /* Move Manip */, {
            className: "manipulator hidden",
            referenceX: cx,
            referenceY: cy,
            onDrag: e=>{
                e.value = {
                    cx: e.sceneX+e.referenceOffsetX,
                    cy: e.sceneY+e.referenceOffsetY,
                    angle, size
                }
                onChange(e)
            }
        }, 
            h("polygon" /* draw shape */, {
                className: "gizmo",
                points: svgPointsString,
                style:{
                    transform: `rotate(${angle}rad) translate(${cx}px, ${cy}px)`,
                    transformOrigin: `${cx}px ${cy}px`
                }
            })
        ),

        h("polygon" /* draw shape */, {
            className: "presenter",
            points: svgPointsString,
            style:{
                transform: `rotate(${angle}rad) translate(${cx}px, ${cy}px)`,
                transformOrigin: `${cx}px ${cy}px`
            }
        }),

        vertices.map( ([x, y], idx)=>h("text", {
            className: "presenter",
            x: x+cx, 
            y: y+cy
        }, `P${idx+1}`)),

        h("g", {
            className: "manipulator show-when-selected",
        }, 
            h(RotateManip, {
                className: "gizmo",
                cx, cy, angle, 
                distance: size+8,
                axis: "Y",
                onChange: e=>{
                    e.value = {
                        cx,cy,size,
                        angle: e.value
                    };
                    onChange(e)
                }
            }),

            h(Manipulator /*  manip size*/, {
                onDragStart: e=>{
                    prevSize = size;
                },
                onDrag: e=>{
                    const distance0 = Math.hypot(e.sceneStartX-cx, e.sceneStartY-cy);
                    const distance1 = Math.hypot(e.sceneX-cx, e.sceneY-cy);
                    e.value = {
                        cx,cy,angle,
                        size: prevSize*distance1/distance0
                    }
                    onChange(e)
                }
            },
                h('polygon', {
                    className: "gizmo",
                    points: svgPointsString,
                    vectorEffect: "non-scaling-stroke",
                    style: {
                        fill: "none",
                        stroke: "transparent",
                        strokeWidth: 5,
                        cursor: "nwse-resize",
                        transform: `rotate(${angle}rad) translate(${cx}px, ${cy}px)`,
                        transformOrigin: `${cx}px ${cy}px`
                    }
                }),
            )
        )
    )
    
}

export default Triangle;