import React from "react";
import Manipulator from "../Manipulators.js";

const h = React.createElement;

function Line({
    x1,y1,x2,y2,
    onChange,
    ...props
})
{

    const [cx, cy] = [x1/2+x2/2, y1/2+y2/2]
    const angle = Math.atan2(y2-y1, x2-x1)
    const width = Math.hypot(y2-y1, x2-x1);
    return h("g", {
        ...props
    }, 
        /* Drag Manip */
        h(Manipulator /* Move Manip */, {
            className: "manipulator hidden",
            referenceX: x1,
            referenceY: y1,
            onDrag: e=>{
                const cx = e.sceneX+e.referenceOffsetX;
                const cy = e.sceneY+e.referenceOffsetY;

                e.value = {
                    x1:e.sceneX+e.referenceOffsetX,
                    y1:e.sceneY+e.referenceOffsetY,
                    x2:e.sceneX+e.referenceOffsetX+(x2-x1),
                    y2:e.sceneY+e.referenceOffsetY+(y2-y1),
                }
                onChange(e)
            }
        }, 
            h("line" /* selection shape */, {
                className: "gizmo",
                x1: x1,
                y1: y1,
                y2: y2,
                x2: x2,
            })
        ),

        h("line" /* draw shape */, {
            className: "presenter",
            x1: x1,
            y1: y1,
            y2: y2,
            x2: x2
        }),

        
        h("rect", /* draw shape */ {
            className: "presenter",
            x: x1, 
            y: y1, 
            width: width, 
            height:10,
            style: {
                transform: `rotate(${angle}rad)`,
                transformOrigin: `${x1}px ${y1}px`,
                fill: "rgba(255,255,255,0.1)",
                stroke: "none"
            }
        }),

        h("text", {
            className: "presenter",
            x: x1, 
            y: y1
        }, "P1"),

        h("text", {
            className: "presenter",
            x: x2, 
            y: y2
        }, "P2"),


        /* Manipulators */
        h("g", {
            className: "manipulator show-when-selected"
        }, 
            h(Manipulator /* Move P1 */, {
                className: "manipulator",
                referenceX: x1,
                referenceY: y1,
                onDrag: e=>{
                    e.value = {
                        x1: e.sceneX,
                        y1: e.sceneY,
                        x2,
                        y2
                    }
                    onChange(e);
                },
                style: {
                    cursor: "move"
                }
            }, 
                h("circle", {
                    className: "gizmo show-when-selected",
                    cx: x1, 
                    cy:y1, 
                    r:5
                })
            ),

            h(Manipulator /* Move P2 */, {
                className: "manipulator",
                referenceX: x2,
                referenceY: y2,
                onDrag: e=>{
                    e.value = {
                        x1,
                        y1,
                        x2: e.sceneX,
                        y2: e.sceneY
                    }
                    onChange(e);
                },
                style: {
                    cursor: "move"
                }
            }, 
                h("circle", {
                    className: "gizmo show-when-selected",
                    cx: x2, 
                    cy:y2, 
                    r:5
                })
            )
        )
    )
}

export default Line;