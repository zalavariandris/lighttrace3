import React from "react";
import Manipulator, {RotateManip} from "../Manipulators.js";
const h = React.createElement;
import * as vec2 from "../../vec2.js"

function DirectionalLight({
    cx,cy,angle, width,
    onChange,
    ...props})
{

    const x1 = cx - Math.cos(angle+Math.PI/2)*width/2;
    const y1 = cy - Math.sin(angle+Math.PI/2)*width/2;
    const x2 = cx + Math.cos(angle+Math.PI/2)*width/2;
    const y2 = cy + Math.sin(angle+Math.PI/2)*width/2;

    return h("g", {
        ...props
    }, 
    
        h(Manipulator /* move manip */, {
            className: "manipulator hidden",
            referenceX: cx,
            referenceY: cy,
            onDrag: e=>{
                e.value = {
                    cx: e.sceneX+e.referenceOffsetX, 
                    cy: e.sceneY+e.referenceOffsetY,
                    angle, width
                },
                onChange(e)
            }
        },
            h("line", {
                x1, y1, x2, y2,
                className: "gizmo"
            })
        ),

        /* draw light icon */
        h("g", {
            className: "presenter"
        },
            h("line", {
                x1, y1,x2,y2,
            }),

            Array.from({length: 9}).map((_, k)=>{
                const offsetX = Math.cos(angle+Math.PI/2)*width*(k-4)/9;
                const offsetY = Math.sin(angle+Math.PI/2)*width*(k-4)/9;
                return h("line", {
                    x1:cx+offsetX+Math.cos(angle)*4, 
                    y1:cy+offsetY+Math.sin(angle)*4, 
                    x2:cx+offsetX+Math.cos(angle)*16, 
                    y2:cy+offsetY+Math.sin(angle)*16, 
                })
            }),

        ),


        h("g", {
            className: "manipulator show-when-selected"
        }, 
            h(RotateManip, {
                cx,cy,angle,
                distance: 100, 
                onChange:e=>{
                    e.value = {
                        cx,cy,width,
                        angle: e.value
                    };
                    onChange(e)
                }
            }),

            h(Manipulator /* width manip */, {
                referenceX: cx+Math.cos(angle)*50,
                referenceY: cy+Math.sin(angle)*50,
                onDrag: e=>{
                    const [localX, localY] = vec2.rotate([e.sceneX-cx, e.sceneY-cy], -angle);
                    
                    e.value = {
                        cx,cy,angle,
                        width: Math.max(0, (localY-cx)*2+10)
                    }
                    onChange(e);
                }
            }, 
                h("circle", {
                    cx: cx+Math.cos(angle+Math.PI/2)*(width/2+10), 
                    cy: cy+Math.sin(angle+Math.PI/2)*(width/2+10), 
                    r:5,
                    className: "gizmo",
                    style: {
                        cursor: "ns-resize",
                    }
                }),
            )
        )
    )
}

export default DirectionalLight;