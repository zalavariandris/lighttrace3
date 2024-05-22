import entityStore from "../stores/entity-store.js";
import React from "react";
import Manipulator from "../widgets/Manipulator.js";
const h = React.createElement;
import SVGRaytracer from "../raytracers/svg-raytracer/SVGRaytracer.js";

import _ from "lodash"




// UTILS
function rotatePoint(x, y, radAngle, pivotX, pivotY)
{
    const x1 = pivotX + (x - pivotX) * Math.cos(radAngle) - (y - pivotY) * Math.sin(radAngle);
    const y1 = pivotY + (x - pivotX) * Math.sin(radAngle) + (y - pivotY) * Math.cos(radAngle);

    return [x1, y1];
}

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

function makeCircleFromThreePoints(S, M, E, {material}={})
{
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

function makePathFromLens({cx,cy,diameter,edgeThickness, centerThickness})
{
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

function SphericalLens({
    entityKey, entity, ...props
})
{
    return h(Manipulator /* Move Manip */, {
        referenceX: entity.transform.translate.x,
        referenceY: entity.transform.translate.y,
        onDrag: e=>entityStore.updateComponent(entityKey, "transform", {
            translate: {
                x: e.sceneX+e.referenceOffsetX, 
                y: e.sceneY+e.referenceOffsetY
            }
        }),
    }, 
        h("path" /* draw shape */, {
            className: entity.selected ? "shape selected" : "shape",
            d: makePathFromLens({
                cx: entity.transform.translate.x, 
                cy: entity.transform.translate.y, 
                diameter: entity.shape.diameter, 
                edgeThickness: entity.shape.edgeThickness, 
                centerThickness: entity.shape.centerThickness,
            }),
            style: {
                transform: `rotate(${entity.transform.rotate}rad)`,
                transformOrigin: `${entity.transform.translate.x}px ${entity.transform.translate.y}px`
            },
            ...props
        }),

        h("g", {style: {display: entity.selected?"initial":"none"}}, 
            h(Manipulator /* Rotate Manip */, {
                referenceX: entity.transform.translate.x+Math.cos(entity.transform.rotate)*50,
                referenceY: entity.transform.translate.y+Math.sin(entity.transform.rotate)*50,
                onDrag: e=>entityStore.updateComponent(entityKey, "transform", {
                    rotate: Math.atan2(e.sceneY-entity.transform.translate.y, e.sceneX-entity.transform.translate.x)
                })
            },
                h("path" /* rotate arrow */,{
                    stroke: "white",
                    strokeWidth: 2,
                    fill: "none",
                    d: describeArc(0,0, Math.max(entity.shape.centerThickness, entity.shape.edgeThickness)/2+15, 80, 100),
                    markerEnd:"url(#arrow)",
                    markerStart:"url(#arrow)",
                    style: {
                        opacity: 0.3,
                        transform: `translate(${entity.transform.translate.x}px, ${entity.transform.translate.y}px) rotate(${entity.transform.rotate}rad)`
                    }
                })
            ),

            h(Manipulator /* manip centerThickness*/, {
                onDrag: e=>{
                    const distance = Math.hypot(e.sceneX-entity.transform.translate.x, e.sceneY-entity.transform.translate.y)
                    entityStore.updateComponent(entityKey, "shape", {
                        centerThickness:  Math.max(0, Math.min(distance*2, entity.shape.diameter))
                    })
                },
                className:"gizmo"
            }, 
                h('circle', {
                    className: "handle",
                    cx:entity.transform.translate.x+Math.cos(entity.transform.rotate)*entity.shape.centerThickness/2, 
                    cy:entity.transform.translate.y+Math.sin(entity.transform.rotate)*entity.shape.centerThickness/2,
                    r: 5,
                    vectorEffect: "non-scaling-stroke",
                    style: {cursor: "ew-resize"}
                })
            ),

            h(Manipulator /* manip edgeTicvkness and diameter*/, {
                onDrag: e=>{
                    const distance = Math.hypot(e.sceneX-entity.transform.translate.x, e.sceneY-entity.transform.translate.y)
                    entityStore.updateComponent(entityKey, "shape", {
                        centerThickness:  Math.max(0, Math.min(distance*2, entity.shape.diameter+entity.shape.edgeThickness))
                    })
                },
                className:"gizmo"
            }, 
                h('circle', {
                    className: "handle",
                    cx:entity.transform.translate.x+Math.cos(entity.transform.rotate)*entity.shape.centerThickness/2, 
                    cy:entity.transform.translate.y+Math.sin(entity.transform.rotate)*entity.shape.centerThickness/2,
                    r: 5,
                    vectorEffect: "non-scaling-stroke",
                    style: {cursor: "ew-resize"}
                })
            ),

            h(Manipulator /*  manip edgeThickness and diameter*/, {
                className:"manip",
                onDrag: e=>{
                    const [localX, localY] = rotatePoint(e.sceneX, e.sceneY, -entity.transform.rotate, entity.transform.translate.x, entity.transform.translate.y);
                    const newEdgeThickness = Math.max(1, (localX-entity.transform.translate.x)*2);
                    const newDiameter = Math.max(1, (localY-entity.transform.translate.y)*2);

                    entityStore.updateComponent(entityKey, "shape", {
                        edgeThickness: newEdgeThickness,
                        centerThickness: Math.max(1, newEdgeThickness-entity.shape.edgeThickness + entity.shape.centerThickness),
                        diameter: newDiameter       
                    });
                }
            },
                h('circle', {
                    className: "gizmo",
                    cx:entity.transform.translate.x+Math.cos(entity.transform.rotate)*entity.shape.edgeThickness/2+Math.cos(entity.transform.rotate+Math.PI/2)*entity.shape.diameter/2, 
                    cy:entity.transform.translate.y+Math.sin(entity.transform.rotate)*entity.shape.edgeThickness/2+Math.sin(entity.transform.rotate+Math.PI/2)*entity.shape.diameter/2,
                    r: 5,
                    vectorEffect: "non-scaling-stroke",
                    style: {cursor: "nwse-resize"}
                }),
            )
        )
    )
}

function Rectangle({
    entityKey, entity, ...props
})
{
    return h(Manipulator /* Move Manip */, {
        referenceX: entity.transform.translate.x,
        referenceY: entity.transform.translate.y,
        onDrag: e=>entityStore.updateComponent(entityKey, "transform", {
            translate: {
                x: e.sceneX+e.referenceOffsetX, 
                y: e.sceneY+e.referenceOffsetY
            }
        }),
    }, 
        h("rect"/* draw shape */, {
            className: entity.selected ? "shape selected" : "shape",
            x: entity.transform.translate.x-entity.shape.width/2, 
            y: entity.transform.translate.y-entity.shape.height/2, 
            width: entity.shape.width,
            height: entity.shape.height,
            style: {
                transform: `rotate(${entity.transform.rotate}rad)`,
                transformOrigin: `${entity.transform.translate.x}px ${entity.transform.translate.y}px`
            },
            ...props
        }),

        h("g", {style: {display: entity.selected?"initial":"none"}}, 
            h(Manipulator /* Rotate Manip */, {
                referenceX: entity.transform.translate.x+Math.cos(entity.transform.rotate)*50,
                referenceY: entity.transform.translate.y+Math.sin(entity.transform.rotate)*50,
                onDrag: e=>entityStore.updateComponent(entityKey, "transform", {
                    rotate: Math.atan2(e.sceneY-entity.transform.translate.y, e.sceneX-entity.transform.translate.x)
                })
            },
                h("path" /* rotate arrow */,{
                    stroke: "white",
                    strokeWidth: 2,
                    fill: "none",
                    d: describeArc(0,0, entity.shape.width/2+20, 80, 100),
                    markerEnd:"url(#arrow)",
                    markerStart:"url(#arrow)",
                    style: {
                        opacity: 0.3,
                        transform: `translate(${entity.transform.translate.x}px, ${entity.transform.translate.y}px) rotate(${entity.transform.rotate}rad)`
                    }
                })
            ),

            h(Manipulator /*  manip width and height*/, {
                className:"manip",
                onDrag: e=>{
                    const [localX, localY] = rotatePoint(e.sceneX, e.sceneY, -entity.transform.rotate, entity.transform.translate.x, entity.transform.translate.y);
                    
                    const newWidth = Math.max(1, (localX-entity.transform.translate.x)*2);
                    const newHeight = Math.max(1, (localY-entity.transform.translate.y)*2);

                    entityStore.updateComponent(entityKey, "shape", {
                        width: newWidth,
                        height: newHeight     
                    });
                }
            },
                h('circle', {
                    className: "gizmo",
                    cx:entity.transform.translate.x+Math.cos(entity.transform.rotate)*entity.shape.width/2+Math.cos(entity.transform.rotate+Math.PI/2)*entity.shape.height/2, 
                    cy:entity.transform.translate.y+Math.sin(entity.transform.rotate)*entity.shape.width/2+Math.sin(entity.transform.rotate+Math.PI/2)*entity.shape.height/2,
                    r: 5,
                    vectorEffect: "non-scaling-stroke",
                    style: {cursor: "nwse-resize"}
                }),
            )
        )
    )
}

function Circle({
    entityKey, entity, ...props
})
{
    return h(Manipulator /* Move Manip */, {
        referenceX: entity.transform.translate.x,
        referenceY: entity.transform.translate.y,
        onDrag: e=>entityStore.updateComponent(entityKey, "transform", {
            translate: {
                x: e.sceneX+e.referenceOffsetX, 
                y: e.sceneY+e.referenceOffsetY
            }
        }),
    }, 
        h("circle" /* draw shape */, {
            className: entity.selected ? "shape selected" : "shape",
            cx: entity.transform.translate.x, 
            cy: entity.transform.translate.y, 
            r: entity.shape.radius,
            ...props
        }),

        h(Manipulator /*  manip radius*/, {
            className:"manip",
            onDrag: e=>{
                const newRadius = Math.hypot(e.sceneX-entity.transform.translate.x, e.sceneY-entity.transform.translate.y)

                entityStore.updateComponent(entityKey, "shape", {
                    radius: newRadius  
                });
            }
        },
            h('circle', {
                className: "gizmo",
                cx: entity.transform.translate.x, 
                cy: entity.transform.translate.y, 
                r: entity.shape.radius,
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
}

function Triangle({
    entityKey, entity, ...props
})
{
    const vertices = Array.from({length: 3}).map((_, k)=>{
        const angle = k/3.0*Math.PI*2-Math.PI/2;
        return [Math.cos(angle)*entity.shape.size, Math.sin(angle)*entity.shape.size];
    });

    const svgPointsString = vertices.map(P=>P.join(", ")).join(" ");

    return h(Manipulator /* Move Manip */, {
        referenceX: entity.transform.translate.x,
        referenceY: entity.transform.translate.y,
        onDrag: e=>entityStore.updateComponent(entityKey, "transform", {
            translate: {
                x: e.sceneX+e.referenceOffsetX, 
                y: e.sceneY+e.referenceOffsetY
            }
        }),
    }, 
        h("polygon" /* draw shape */, {
            style:{
                transform: `rotate(${entity.transform.rotate}rad) translate(${entity.transform.translate.x}px, ${entity.transform.translate.y}px)`,
                transformOrigin: `${entity.transform.translate.x}px ${entity.transform.translate.y}px`
            
            },
            className: entity.selected ? "shape selected" : "shape",
            points: svgPointsString,
            ...props
        }),

        h("g", {style: {display: entity.selected?"initial":"none"}}, 
            h(Manipulator /* rotate manip */, {
                referenceX: entity.transform.translate.x+Math.cos(entity.transform.rotate)*50,
                referenceY: entity.transform.translate.y+Math.sin(entity.transform.rotate)*50,
                onDrag: e=>entityStore.updateComponent(entityKey, "transform", {
                    rotate: Math.atan2(e.sceneY-entity.transform.translate.y, e.sceneX-entity.transform.translate.x)
                })
            }, 
               
                FA({
                    x:entity.transform.translate.x+Math.cos(entity.transform.rotate)*50, 
                    y:entity.transform.translate.y+Math.sin(entity.transform.rotate)*50,
                    icon:"rotate",
                    style: {
                        fill: "white", 
                        stroke: "none",
                        transform: `rotate(${entity.transform.rotate}rad)`,
                        transformOrigin: `${entity.transform.translate.x+Math.cos(entity.transform.rotate)*70}px ${entity.transform.translate.y+Math.sin(entity.transform.rotate)*70}px`
                    }
                })
            ),

            h(Manipulator /*  manip radius*/, {
                className:"manip",
                onDrag: e=>{
                    const newRadius = Math.hypot(e.sceneX-entity.transform.translate.x, e.sceneY-entity.transform.translate.y)

                    entityStore.updateComponent(entityKey, "shape", {
                        size: newRadius  
                    });
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
                        transform: `translate(${entity.transform.translate.x}px, ${entity.transform.translate.y}px) rotate(${entity.transform.rotate}rad)`,
                        transformOrigin: `${entity.transform.translate.x+Math.cos(entity.transform.rotate)*70}px ${entity.transform.translate.y+Math.sin(entity.transform.rotate)*70}px`
                    }
                }),
            )
        )
    )
}

function Line({
    entityKey, entity, ...props
})
{
    const x1 = entity.transform.translate.x - Math.cos(entity.transform.rotate)*entity.shape.length/2;
    const y1 = entity.transform.translate.y - Math.sin(entity.transform.rotate)*entity.shape.length/2;
    const x2 = entity.transform.translate.x + Math.cos(entity.transform.rotate)*entity.shape.length/2;
    const y2 = entity.transform.translate.y + Math.sin(entity.transform.rotate)*entity.shape.length/2;

    function setP1(x1,y1)
    {
        entityStore.updateComponent(entityKey, "transform", {
            translate: {
                x: (x1+x2)/2, 
                y: (y1+y2)/2
            },
            rotate: Math.atan2(y2-y1, x2-x1)
        });
        entityStore.setValue(`${entityKey}.shape.length`, Math.hypot(x2-x1, y2-y1));
    }

    function setP2(x2,y2)
    {
        entityStore.updateComponent(entityKey, "transform", {
            translate: {
                x: (x1+x2)/2, 
                y: (y1+y2)/2
            },
            rotate: Math.atan2(y2-y1, x2-x1)
        });

        entityStore.setValue(`${entityKey}.shape.length`, Math.hypot(x2-x1, y2-y1));
    }

    return h(Manipulator /* Move Manip */, {
        referenceX: entity.transform.translate.x,
        referenceY: entity.transform.translate.y,
        onDrag: e=>entityStore.updateComponent(entityKey, "transform", {
            translate: {
                x: e.sceneX+e.referenceOffsetX, 
                y: e.sceneY+e.referenceOffsetY
            }
        }),
    }, 
        h("line" /* draw shape */, {
            x1: x1,
            y1: y1,
            y2: y2,
            x2: x2,
            style:{
                // transform: `rotate(${entity.transform.rotate}rad) translate(${entity.transform.translate.x}px, ${entity.transform.translate.y}px)`,
                // transformOrigin: `${entity.transform.translate.x}px ${entity.transform.translate.y}px`,
                strokeWidth: 3
            },
            className: entity.selected ? "shape selected" : "shape",
            ...props
        }),

        /* Manipulators */
        h("g", {style: {display: entity.selected?"initial":"none"}}, 
            h(Manipulator /* Move P1 */, {
                referenceX: x1,
                referenceY: y1,
                onDrag: e=>setP1(e.sceneX, e.sceneY)
            }, 
                h("circle", {cx: x1, cy:y1, r:5})
            ),

            h(Manipulator /* Move P2 */, {
                referenceX: x2,
                referenceY: y2,
                onDrag: e=>setP2(e.sceneX, e.sceneY)
            }, 
                h("circle", {cx: x2, cy:y2, r:5})
            )
        )
    )
}

function PointLight({entityKey, entity})
{
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
            className: "gizmo",
            onClick: e=>entityStore.setSelection([key])
        }),

        h(Manipulator /* rotate manip*/, {
            referenceX: entity.transform.translate.x+Math.cos(entity.transform.rotate)*50,
            referenceY: entity.transform.translate.y+Math.sin(entity.transform.rotate)*50,
            onDrag: e=>entityStore.updateComponent(key, "transform", {
                rotate: Math.atan2(e.sceneY-entity.transform.translate.y, e.sceneX-entity.transform.translate.x)
            })
        }, 
            h("path" /* rotate arrow */,{
                stroke: "white",
                strokeWidth: 2,
                fill: "none",
                d: describeArc(0,0, 50, 80, 100),
                markerEnd:"url(#arrow)",
                markerStart:"url(#arrow)",
                style: {
                    opacity: 0.3,
                    transform: `translate(${entity.transform.translate.x}px, ${entity.transform.translate.y}px) rotate(${entity.transform.rotate}rad)`
                }
            })
        )
    )
}

function LaserLight({entityKey, entity})
{
    return h(Manipulator /* tmove manip */, {
        referenceX: entity.transform.translate.x,
        referenceY: entity.transform.translate.y,
        onDrag: e=>entityStore.updateComponent(entityKey, "transform", {
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
            className: "gizmo",
            onClick: e=>entityStore.setSelection([entityKey])
        }),

        h("g", {style: {display: entity.selected?"initial":"none"}}, 
            h(Manipulator /* rotate manip */, {
                referenceX: entity.transform.translate.x+Math.cos(entity.transform.rotate)*50,
                referenceY: entity.transform.translate.y+Math.sin(entity.transform.rotate)*50,
                onDrag: e=>entityStore.updateComponent(entityKey, "transform", {
                    rotate: Math.atan2(e.sceneY-entity.transform.translate.y, e.sceneX-entity.transform.translate.x)
                })
            }, 
            h("path" /* rotate arrow */,{
                stroke: "white",
                strokeWidth: 2,
                fill: "none",
                d: describeArc(0,0, 50, 80, 100),
                markerEnd:"url(#arrow)",
                markerStart:"url(#arrow)",
                style: {
                    opacity: 0.3,
                    transform: `translate(${entity.transform.translate.x}px, ${entity.transform.translate.y}px) rotate(${entity.transform.rotate}rad)`
                }
            })
            )
        )
    )
}

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    var angleInRadians = (angleInDegrees-90) * Math.PI / 180.0;

    return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
    };
}
  
function describeArc(x, y, radius, startAngle, endAngle){

    var start = polarToCartesian(x, y, radius, endAngle);
    var end = polarToCartesian(x, y, radius, startAngle);

    var largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    var d = [
        "M", start.x, start.y, 
        "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");

    return d;       
}

function FA({
        x, y, icon, style
    }){
    const icons = {
        group: '\uf0c0',
        link: '\uf0c1',
        cloud: '\uf0c2',
        beaker: '\uf0c3',
        cut: '\uf0c4',
        copy: '\uf0c5',
        paperClip: '\uf0c6',
        save: '\uf0c7',
        signBlank: '\uf0c8',
        reorder: '\uf0c9',
        listUl: '\uf0ca',
        listOl: '\uf0cb',
        strikethrough: '\uf0cc',
        underline: '\uf0cd',
        table: '\uf0ce',
        rotate: '\uf2f1'
    }
    return h("text", {
        style:{
            fontFamily: 'FontAwesome',
            ...style
        },
        x:x, 
        y:y,
    }, icons[icon])
}

function DirectionalLight({entityKey, entity})
{
    return h(Manipulator /* rotate manip */, {
        referenceX: entity.transform.translate.x,
        referenceY: entity.transform.translate.y,
        onDrag: e=>entityStore.updateComponent(entityKey, "transform", {
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
            className: "shape",
            onClick: e=>entityStore.setSelection([entityKey])
        }),

        h("g", {style: {display: entity.selected?"initial":"none"}}, 
            h(Manipulator /* rotate manip */, {
                referenceX: entity.transform.translate.x+Math.cos(entity.transform.rotate)*50,
                referenceY: entity.transform.translate.y+Math.sin(entity.transform.rotate)*50,
                onDrag: e=>entityStore.updateComponent(entityKey, "transform", {
                    rotate: Math.atan2(e.sceneY-entity.transform.translate.y, e.sceneX-entity.transform.translate.x)
                })
            }, 
               
                FA({
                    x:entity.transform.translate.x+Math.cos(entity.transform.rotate)*50, 
                    y:entity.transform.translate.y+Math.sin(entity.transform.rotate)*50,
                    icon:"rotate",
                    style: {
                        fill: "white", 
                        stroke: "none",
                        transform: `rotate(${entity.transform.rotate}rad)`,
                        transformOrigin: `${entity.transform.translate.x+Math.cos(entity.transform.rotate)*70}px ${entity.transform.translate.y+Math.sin(entity.transform.rotate)*70}px`
                    }
                })
            ),

            h("foreignObject", {
                x:entity.transform.translate.x-50, 
                y:entity.transform.translate.y+10, 
                width:"100", 
                height:"20"}, 
                h("input", {
                    type: "range",
                    min:0.0,
                    max: 10.0,
                    step: 0.1,
                    value: entity.light.intensity,
                    style: {width: 95},
                    onMouseDown: e=>{
                        console.log("mousedown")
                        e.stopPropagation();
                    },
                    onChange: e=>entityStore.setValue(`${entityKey}.light.intensity`, e.target.value)
                })
            ),

            h(Manipulator /* width manip */, {
                referenceX: entity.transform.translate.x+Math.cos(entity.transform.rotate)*50,
                referenceY: entity.transform.translate.y+Math.sin(entity.transform.rotate)*50,
                onDrag: e=>entityStore.setValue(`${entityKey}.light.width`, Math.hypot(e.sceneY-entity.transform.translate.y, e.sceneX-entity.transform.translate.x)*2)
            }, 
                h("circle", {
                    cx: entity.transform.translate.x+Math.cos(entity.transform.rotate+Math.PI/2)*entity.light.width/2, 
                    cy: entity.transform.translate.y+Math.sin(entity.transform.rotate+Math.PI/2)*entity.light.width/2, 
                    r:10,
                    className: "gizmo"
                }),


            )
        )
    )
}

function SVGViewport({width, height, className, viewBox, onViewBoxChange, ...props})
{
    const scene = React.useSyncExternalStore(entityStore.subscribe, entityStore.getSnapshot);

    // pan and zoom
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

    function handleClick(e){

    }

    
    return h("svg", {
        width, 
        height, 
        className,
        viewBox: viewboxString(viewBox),
        ...props,
        onMouseDown: (e)=>panViewport(e),
        onWheel: (e) => zoomViewportWithmouseWheel(e),
        onClick: (e)=>{
            if(e.target.tagName=='svg') // TODO test against itself
            {
                entityStore.setSelection([])
            }
        }
    }, 

    h("defs", null,
        h("marker", {
            id:"arrow",
            viewBox:"0 0 10 10",
            refX:"1",
            refY:"5",
            markerWidth:"3",
            markerHeight:"3",
            orient:"auto-start-reverse"
        },
            h("path", {
                d: "M 0 0 L 5 5 L 0 10 z", // This path represents an arrow
                fill: "white"
            })
        )
    ),

        // SHAPES
        Object.entries(scene)
        .filter(([key, entity])=>{
            return entity.hasOwnProperty("shape") && entity.hasOwnProperty("transform");
        })
        .map( ([key, entity])=>{
            switch (entity.shape.type) {
                case "circle":
                    return h(Circle, {
                        entityKey: key, 
                        entity: entity,
                        onClick: e=>entityStore.setSelection([key])
                    })
                case "rectangle":
                    return h(Rectangle, {
                        entityKey: key, 
                        entity: entity,
                        onClick: e=>entityStore.setSelection([key])
                    })
                case "sphericalLens":
                    return h(SphericalLens, {
                        entityKey: key, 
                        entity: entity,
                        onClick: e=>entityStore.setSelection([key])
                    })
                case "triangle":
                    return h(Triangle, {
                        entityKey: key, 
                        entity: entity,
                        onClick: e=>entityStore.setSelection([key])
                    })
                case "line":
                    return h(Line, {
                        entityKey: key, 
                        entity: entity,
                        onClick: e=>entityStore.setSelection([key])
                    })
                default:
                    break;
            }

        }),

        // LIGHTS
        Object.entries(scene)
        .filter(([key, entity])=>entity.hasOwnProperty("transform") && entity.hasOwnProperty("light"))
        .map( ([key, entity])=>{
            switch (entity.light.type) {
                case "point":
                    return h(PointLight, {entityKey: key, entity: entity})
                case "laser":
                    return h(LaserLight, {entityKey: key, entity: entity})
                case "directional":
                    return h(DirectionalLight, {entityKey: key, entity: entity})
            
                default:
                    break;
            }

        }),

        // RAYS
        h(SVGRaytracer)
    );
}

export default SVGViewport;