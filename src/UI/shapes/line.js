import React from "react";
import Manipulator from "../Manipulators.js";

const h = React.createElement;

function Line({
    x1,y1,x2,y2,
    onChange,
    ...props
})
{
    // const x1 = entity.transform.translate.x - Math.cos(entity.transform.rotate)*entity.shape.length/2;
    // const y1 = entity.transform.translate.y - Math.sin(entity.transform.rotate)*entity.shape.length/2;
    // const x2 = entity.transform.translate.x + Math.cos(entity.transform.rotate)*entity.shape.length/2;
    // const y2 = entity.transform.translate.y + Math.sin(entity.transform.rotate)*entity.shape.length/2;

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