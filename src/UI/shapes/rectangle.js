import React from "react";
import Manipulator, {RotateManip} from "../Manipulators.js";
import {rotatePoint} from "../../utils.js"
const h = React.createElement;

function Rectangle({
    cx, cy, width, height, angle,
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
                    width, height, angle
                }
                onChange(e);
            }
        }, 
            h("rect"/* draw shape */, {
                x: cx-width/2, 
                y: cy-height/2, 
                width: width,
                height: height,
                style: {
                    transform: `rotate(${angle}rad)`,
                    transformOrigin: `${cx}px ${cy}px`
                }
            }),

            h("g", {
                className: "manipulator"
            }, 
                h(RotateManip, {
                    cx,cy,angle,
                    distance: height/2+8,
                    axis: "Y",
                    onChange: e=>{
                        e.value = {
                            cx,cy,
                            angle:e.value,
                            width,
                            height
                        };
                        onChange(e)
                    }
                }),

                h(Manipulator /*  manip width and height*/, {
                    className:"manip",
                    onDrag: e=>{
                        const [localX, localY] = rotatePoint(e.sceneX, e.sceneY, -angle, cx, cy);
                        
                        const newWidth = Math.max(1, (localX-cx)*2);
                        const newHeight = Math.max(1, (localY-cy)*2);

                        e.value = {
                            cx,cy,angle,
                            width: newWidth,
                            height: newHeight
                        };
                        onChange(e)
                    }
                },
                    h("path", {
                        d: "M0,-10 L0,0 L-10,00",
                        stroke: "white",
                        strokeWidth: "5px",
                        fill: "transparent",
                        vectorEffect: "non-scaling-stroke",
                        style: {
                            cursor: "nwse-resize",
                            transform: ` rotate(${angle}rad) translate(${cx+width/2+4}px, ${cy+height/2+4}px)`,
                            transformOrigin: `${cx}px ${cy}px`
                        }
                    })
                )
            )
        )
    )
}

export default Rectangle;