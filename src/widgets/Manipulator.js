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
        referenceY
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

    }
}

function cursorPoint(svg, {x, y}){
    let pt = svg.createSVGPoint();
    pt.x =x; pt.y = y;
    const scenePoint = pt.matrixTransform(svg.getScreenCTM().inverse());
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
        // const svg = e.target.closest("SVG");
        // mouseScenePos.current = {x: scene_x, scene_y}
        e.stopPropagation();
        e.preventDefault();


        const svg = e.target.closest("SVG");
        let startLoc = cursorPoint(svg, {x: e.clientX, y:e.clientY});

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
            let loc = cursorPoint(svg, {x: e.clientX, y:e.clientY});

            onDrag(new ManipEvent({
                sceneX: loc.x, 
                sceneY: loc.y,
                sceneStartX: startLoc.x,
                sceneStartY: startLoc.y, 
                referenceX: referenceX,
                referenceY: referenceY,
                nativeEvent: e
            }))
            setSceneMouse({x: loc.x, y: loc.y})
        }

        const handleMouseUp = (e)=>{
            var svg  = e.target.closest("SVG");
            let loc = cursorPoint(svg, {x: e.clientX, y:e.clientY});
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
            var svg  = e.target.closest("SVG");
            let loc = cursorPoint(svg, {x: e.clientX, y:e.clientY});
            const dx = startLoc.x-loc.x
            const dy = startLoc.y-loc.y
            if(dx**2+dy**2>1){
                e.stopPropagation()
            }
        }

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", (e)=>handleMouseUp(e), {once: true});
        window.addEventListener("click", (e)=>handleClick(e), {once: true, capture:true});
    }

    return h("g", {
        ref:ref,
        style: {cursor: active?"grabbing":"grab"},
        ...props,
        onMouseDown: (e)=>handleMouseDown(e),
        onClick:onClick
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
        props.children
    )
}

export default Manipulator;