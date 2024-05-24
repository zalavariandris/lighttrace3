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
    return h("i", {className: getIconName()})
}

export default Icon;