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
        /* Drag Manip */
        h(Manipulator, {
            className: "manipulator hidden",
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
                className: "gizmo",
                cx: cx, 
                cy: cy, 
                r: r
            })
        ),

        /* Draw shape */
        h("circle" , {
            className: "presenter",
            cx: cx, 
            cy: cy, 
            r: r
        }),

        /* other manipulators */
        h("g", {
            className: "manipulator show-when-selected",
        },
            
            h(Manipulator /*  manip radius*/, {
                className:"manipulator",
                onDrag: e=>{
                    const newRadius = Math.hypot(e.sceneX-cx, e.sceneY-cy)
                    e.value = {
                        cx,cy,
                        r: newRadius
                    }
                    onChange(e)
                }
            },
                h('circle', {
                    className: "gizmo",
                    cx: cx, 
                    cy: cy, 
                    r: r,
                    style: {
                        fill: "none",
                        cursor: "nwse-resize"
                    }
                }),
            )
        )
        
    )
}

export default Circle;