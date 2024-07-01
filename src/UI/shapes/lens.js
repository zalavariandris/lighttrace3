import React from "react";
import Manipulator, {RotateManip} from "../Manipulators.js";
import {rotatePoint, makePathFromLens} from "../../utils.js"
import Sprite from "../Sprite.js"
const h = React.createElement;

function Lens({
    cx, cy,
    angle,
    diameter,
    edgeThickness,
    centerThickness,
    onChange,
    ...props
})
{


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
                    angle, diameter, edgeThickness, centerThickness
                };
                onChange(e);
            }
        }, 
            h("path" /* draw shape */, {
                className: "gizmo",
                d: makePathFromLens({
                    cx: cx, 
                    cy: cy, 
                    diameter: diameter, 
                    edgeThickness: edgeThickness, 
                    centerThickness: centerThickness,
                }),
                style: {
                    transform: `rotate(${angle}rad)`,
                    transformOrigin: `${cx}px ${cy}px`
                }
            })
        ),

        h("path" /* draw shape */, {
            className: "presenter",
            d: makePathFromLens({
                cx: cx, 
                cy: cy, 
                diameter: diameter, 
                edgeThickness: edgeThickness, 
                centerThickness: centerThickness,
            }),
            style: {
                transform: `rotate(${angle}rad)`,
                transformOrigin: `${cx}px ${cy}px`
            }
        }),

        h("g", {
            className: "manipulator show-when-selected",
        }, 
            h(RotateManip,{
                cx,cy,angle,
                distance: Math.max(centerThickness/2+16, edgeThickness/2),
                onChange: e=>{
                    e.value = {
                        cx,cy,
                        angle:e.value,
                        diameter, edgeThickness, centerThickness
                    };
                    onChange(e);
                }
                
            }),

            h(Manipulator /* manip centerThickness*/, {
                onDrag: e=>{
                    const distance = Math.hypot(e.sceneX-cx, e.sceneY-cy)
                    e.value = {
                        cx,cy,
                        angle, diameter, edgeThickness, 
                        centerThickness: Math.max(0, Math.min(distance*2, diameter))
                    };
                    onChange(e);
                },
                className:"gizmo"
            }, 
                h('circle', {
                    className: "handle",
                    cx:cx+Math.cos(angle)*centerThickness/2, 
                    cy:cy+Math.sin(angle)*centerThickness/2,
                    r: 5,
                    vectorEffect: "non-scaling-stroke",
                    style: {cursor: "ew-resize"}
                })
            ),

            h(Manipulator /*  manip edgeThickness and diameter*/, {
                className:"manip",
                onDrag: e=>{
                    const [localX, localY] = rotatePoint(e.sceneX, e.sceneY, -angle, cx, cy);
                    
                    const newEdgeThickness = Math.max(1, (localX-cx)*2);
                    const newDiameter = Math.max(1, (localY-cy)*2);
                    const newCenterThickness = Math.max(1, newEdgeThickness-edgeThickness + centerThickness);

                    e.value = {
                        cx,cy,
                        angle, 
                        diameter: newDiameter, 
                        edgeThickness: newEdgeThickness, 
                        centerThickness: newCenterThickness
                    };
                    onChange(e);
                }
            },
                h('circle', {
                    className: "gizmo",
                    cx:cx+Math.cos(angle)*edgeThickness/2+Math.cos(angle+Math.PI/2)*diameter/2, 
                    cy:cy+Math.sin(angle)*edgeThickness/2+Math.sin(angle+Math.PI/2)*diameter/2,
                    r: 5,
                    vectorEffect: "non-scaling-stroke",
                    style: {cursor: "nwse-resize"}
                }),
            )
        )
    )
}

export default Lens;