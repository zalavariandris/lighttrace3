import React from "react";
const h = React.createElement;

function Icon({icon, ...props})
{
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
                className: "icon",
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
        case "material":
            return h("svg", {
                className: "icon",
                width:32,
                height: 32,
                viewBox: "0, 0, 32, 32",
                style: {
                    width: "1em",
                    height: "1em"
                }
            },
                h("path", {
                    fill:"#ffffff",
                    d:"M328 368c-3.86 0-7 3.14-7 7s3.14 7 7 7 7-3.14 7-7-3.14-7-7-7zm0 1c3.32 0 6 2.68 6 6s-2.68 6-6 6-6-2.68-6-6 2.68-6 6-6z",
                    transform:"translate(-318 -365)"

                }),
                h("path", {
                    fill:"#ffffff",
                    d:"M327.129 369.967a1 1 0 0 0-.168.023 5.122 5.122 0 0 0-3.977 3.996 1 1 0 1 0 1.961.397 3.11 3.11 0 0 1 2.422-2.434 1 1 0 0 0-.238-1.982z",
                    transform:"translate(-318 -365)"
                }),
                h("path", {
                    fill:"#ffffff",
                    d:"M332.496 373.096a.4.4 0 0 0-.28.687l2 2a.4.4 0 1 0 .567-.566l-2-2a.4.4 0 0 0-.287-.121zm-.75 2.25a.4.4 0 0 0-.28.687l2 2a.4.4 0 1 0 .567-.566l-2-2a.4.4 0 0 0-.287-.121zm-1.25 1.75a.4.4 0 0 0-.28.687l2 2a.4.4 0 1 0 .567-.566l-2-2a.4.4 0 0 0-.287-.121zm-1.75 1.25a.4.4 0 0 0-.28.687l2 2a.4.4 0 1 0 .567-.566l-2-2a.4.4 0 0 0-.287-.121zm-2.236.75a.4.4 0 0 0-.274.705l2 1.75a.4.4 0 1 0 .528-.602l-2-1.75a.4.4 0 0 0-.254-.103z",
                    transform:"translate(-318 -365)"
                })

            );
        default:
            return h("i", {className: "icon "+getIconName()})
    }
}

export default Icon;