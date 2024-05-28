import React from "react";
const h = React.createElement;
import entityStore from "../../stores/entity-store.js";
import Manipulator, {RotateManip} from "../Manipulators.js";

function Triangle({
    entityKey, entity, 
    ...props
})
{
    const [cx, cy] = [entity.transform.translate.x, entity.transform.translate.y];
    const angle = entity.transform.rotate;
    const size = entity.shape.size;


    const vertices = Array.from({length: 3}).map((_, k)=>{
        const angle = k/3.0*Math.PI*2-Math.PI/2;
        return [Math.cos(angle)*entity.shape.size, Math.sin(angle)*entity.shape.size];
    });

    const svgPointsString = vertices.map(P=>P.join(", ")).join(" ");
    let prevSize;

    const onChange = e=>{

    }

    return h("g", {
        className: entity.selected ? "shape selected" : "shape",
        ...props
    }, 
        h(Manipulator /* Move Manip */, {
            referenceX: cx,
            referenceY: cy,
            onDrag: e=>entityStore.setValue(`${entityKey}.transform.translate`, {
                x: e.sceneX+e.referenceOffsetX, 
                y: e.sceneY+e.referenceOffsetY
            })
        }, 
            h("polygon" /* draw shape */, {
                style:{
                    transform: `rotate(${angle}rad) translate(${cx}px, ${cy}px)`,
                    transformOrigin: `${cx}px ${cy}px`
                },
                points: svgPointsString,
                ...props
            }),

            h("g", {
                className: "manipulator",
                style: {
                    display: entity.selected?"initial":"none"
                }
            }, 
                h(RotateManip, {
                    cx, cy, angle, 
                    distance: size+8,
                    axis: "Y",
                    onChange: e=>entityStore.setValue(`${entityKey}.transform.rotate`, e.value)
                }),

                h(Manipulator /*  manip size*/, {
                    className:"manip",
                    onDragStart: e=>{
                        prevSize = size;
                    },
                    onDrag: e=>{
                        const d0 = Math.hypot(e.sceneStartX-cx, e.sceneStartY-cy);
                        const d1 = Math.hypot(e.sceneX-cx, e.sceneY-cy);
                        // console.log(newSize)
                        entityStore.setValue(`${entityKey}.shape.size`, prevSize*d1/d0);
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
    )
}

export default Triangle;