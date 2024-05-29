import React, {useState} from "react"


const h = React.createElement;

class ManipEvent{
    constructor({
        sceneX, 
        sceneY, 
        sceneStartX, 
        sceneStartY, 
        nativeEvent,
        referenceX,
        referenceY,
        value
    })
    {
        this.sceneX = sceneX;
        this.sceneY = sceneY;
        this.sceneStartX = sceneStartX;
        this.sceneStartY = sceneStartY
        this.nativeEvent = nativeEvent;
        this.referenceX = referenceX?referenceX:sceneStartX;
        this.referenceY = referenceY?referenceY:sceneStartY;
        this.referenceOffsetX = referenceX?referenceX-sceneStartX:0;
        this.referenceOffsetY = referenceY?referenceY-sceneStartY:0;
        this.value = value

    }
}

function cursorPoint(svg, {x, y},){
    let pt = svg.createSVGPoint();
    pt.x =x; pt.y = y;
    const ctm = svg.getScreenCTM().inverse();
    return pt.matrixTransform(ctm);
    return {x:scenePoint.x, y:scenePoint.y};
}

function Manipulator({
    onDragStart=(manipEvent)=>{},
    onDrag=(manipEvent)=>{},
    onDragEnd=(manipEvent)=>{},
    referenceX=null,
    referenceY=null,
    onClick=(e)=>{},
    showGuide=true,
    showReference=false,
    style,
    children,
    ...props
}={})
{
    const ref = React.useRef(null)
    const [active, setActive] = React.useState(false);
    const [sceneStart, setSceneStart] = React.useState({x:0, y:0})
    const [sceneMouse, setSceneMouse] = React.useState({x:0, y:0})
    // const [mouseScenePos, setMouseScenePos] = React.useState({x: x, y: y});
    // const [startPos, setStartPos] = React.useState({x: x, y: y});

    // TODO: dispatct startDrag, when mouse is mactually moved. Not on mousedown.   
    const handleMouseDown = (e)=>{
        if(props.onMouseDown){
            // call native event
            props.onMouseDown(e)
        }
        console.log("mousedown")
        // const svg = e.target.closest("SVG");
        // mouseScenePos.current = {x: scene_x, scene_y}
        e.stopPropagation();
        e.preventDefault();
        

        const svg = e.target.closest("SVG");
        let startLoc = cursorPoint(svg, {x: e.clientX, y:e.clientY}, svg);

        setSceneMouse({x: startLoc.x, y: startLoc.y})
        setSceneStart({x: startLoc.x, y: startLoc.y})
        setActive(true)

        onDragStart(new ManipEvent({
            sceneX: startLoc.x, 
            sceneY: startLoc.y,
            sceneStartX: startLoc.x,
            sceneStartY: startLoc.y, 
            referenceX: referenceX,
            referenceY: referenceY,
            nativeEvent: e
        }));

        const handleMouseMove = (e)=>{
            const sceneLoc = cursorPoint(svg, {x: e.clientX, y:e.clientY}, svg);

            onDrag(new ManipEvent({
                sceneX: sceneLoc.x, 
                sceneY: sceneLoc.y,
                sceneStartX: startLoc.x,
                sceneStartY: startLoc.y, 
                referenceX: referenceX,
                referenceY: referenceY,
                nativeEvent: e
            }))
            setSceneMouse({x: sceneLoc.x, y: sceneLoc.y})
        }

        const handleMouseUp = (e)=>{
            const loc = cursorPoint(svg, {x: e.clientX, y:e.clientY}, svg);
            window.removeEventListener("mousemove", handleMouseMove);
            onDragEnd(new ManipEvent({
                sceneX: loc.x, 
                sceneY: loc.y,
                sceneStartX: startLoc.x,
                sceneStartY: startLoc.y, 
                referenceX: referenceX,
                referenceY: referenceY,
                nativeEvent: e
            }))
            setActive(false)
        }

        const handleClick = (e)=>{
            const loc = cursorPoint(svg, {x: e.clientX, y:e.clientY});
            const dx = startLoc.x-loc.x
            const dy = startLoc.y-loc.y
            if(dx**2+dy**2>1){
                e.stopPropagation()
            }
        }

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", (e)=>handleMouseUp(e), {once: true, capture: true});
        window.addEventListener("click", (e)=>handleClick(e), {once: true, capture:true});
    }

    return h("g", {
        ref:ref,
        style: {
            cursor: active?"grabbing":"grab",
            ...style
        },
        onMouseDown: (e)=>handleMouseDown(e),
        onClick:onClick,
        ...props,
    }, 
        (active&&showGuide)?h("line", {
            className: "guide",
            x1: sceneStart.x,
            y1: sceneStart.y,
            x2: sceneMouse.x,
            y2: sceneMouse.y,
            vectorEffect: "non-scaling-stroke",
        }):null,
        (active&&showReference)?h("circle", {
            className: "guide",
            cx: referenceX,
            cy: referenceY,
            r:5,
            vectorEffect: "non-scaling-stroke",
        }):null,
        children
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

function RotateManip({
    cx,
    cy,
    angle,
    distance=100, 
    onChange,
    axis="X",
    ...props
}={}){
    const adjustedAngle = axis=="Y"?angle-Math.PI/2:angle;
    const arcAngle = Math.atan2(8, distance);
    return h(Manipulator /* rotate manip */, {
        referenceX: cx+Math.cos(adjustedAngle)*50,
        referenceY: cy+Math.sin(adjustedAngle)*50,
        onDrag: e=>{
            let newAngle = Math.atan2(e.sceneY-cy, e.sceneX-cx)
            if(axis=="Y"){
                newAngle+=Math.PI/2;
            }
            e.value = newAngle
            onChange(e)
        },
        style: {
            cursor: "url('../cursors/clockwise-rotation.svg') 16 16, auto",
        },
        ...props
    }, 
        h("circle", {
            cx:cx+Math.cos(adjustedAngle)*distance, 
            cy:cy+Math.sin(adjustedAngle)*distance,
            r: 8,
            className: "gizmo rotate hidden",
            style: {
                fill: "transparent",
                stroke: "transparent"
            }
        }),

        h("path" /* rotate arrow */,{
            className: "gizmo",            
            d: describeArc(0,0, 5, 90-120, 90+120),
            markerEnd:"url(#arrow)",
            markerStart:"url(#arrow)",
            style: {
                transform: `translate(${cx+Math.cos(adjustedAngle)*distance}px, ${cy+Math.sin(adjustedAngle)*distance}px) rotate(${adjustedAngle}rad)`,
                pointerEvents: "none",
                stroke: "white",
                strokeWidth: 4,
                fill: "none"
            }
        })
    )
}

export {RotateManip}
export default Manipulator;