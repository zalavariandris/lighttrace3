import React from "react";
import Manipulator, {RotateManip} from "../Manipulators.js";


const h = React.createElement;
function Circle({
    cx, cy, r,
    onChange,
    ...props
})
{
    return h("g", {
        ...props
    }, 
        h(Manipulator /* Move Manip */, {
            referenceX: cx,
            referenceY: cy,
            onDrag: e=>{
                e.value = {
                    cx: e.sceneX+e.referenceOffsetX, 
                    cy: e.sceneY+e.referenceOffsetY,
                    r:r
                };
                onChange(e)
            }
        }, 
            h("circle" /* draw shape */, {
                cx: cx, 
                cy: cy, 
                r: r
            }),

            h(Manipulator /*  manip radius*/, {
                className:"manip",
                onDrag: e=>{
                    const newRadius = Math.hypot(e.sceneX-cx, e.sceneY-cy)
                    e.value = {
                        cx,cy,
                        r: newRadius
                    }
                    onChange(e)
                    // entityStore.setValue(`${entityKey}.shape.radius`, newRadius);
                }
            },
                h('circle', {
                    className: "gizmo",
                    cx: cx, 
                    cy: cy, 
                    r: r,
                    vectorEffect: "non-scaling-stroke",
                    style: {
                        fill: "none",
                        stroke: "transparent",
                        strokeWidth: 5,
                        cursor: "nwse-resize"
                    }
                }),
            )
        )
    )
}

export default Circle;