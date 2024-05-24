import React from "react";
const h = React.createElement;

function Icon({icon, ...props})
{
    console.log(icon)
    function getIconName(){
        switch (icon) {
            case "cursor":
                return "cil-cursor";
            case "circle":
                return "cil-circle";
            case "rectangle":
                return "cil-rectangle";
            case "square":
                return "cil-square";
            case "line":
                return "cil-pen-alt";
            case "lens":
                return "cil-drop";
            case "triangle":
                return "cil-triangle";
            case "lightbulb":
                return "cil-lightbulb";
            case "laser":
                return "cil-pencil";
            case "sun":
                return "cil-sun";
            case "move":
                return "cil-cursor-move"
            case "rotate":
                return "cil-cursor-rotate"
            case "trash":
                return "cil-trash";
            case "cog":
                return "cil-cog";
            case "restore":
                return "cil-reload";
        
            default:
                return "cil-vector";
        }
    }

    switch (icon) {
        case "line":
            return h("svg", {
                width:32,
                height: 32,
                viewBox: "0, 0, 32, 32",
                style: {
                    width: "1em",
                    height: "1em"
                }
            },
                h("line", {
                    x1:"95%",  
                    y1:"30%",
                    x2:"5%",
                    y2:"70%",
                    stroke: "white",
                    strokeWidth: 4
                }),

            );
    
        default:
            return h("i", {className: "icon "+getIconName()})
    }
}

export default Icon;