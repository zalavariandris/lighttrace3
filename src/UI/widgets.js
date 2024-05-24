import React from "react"
import {CInputGroup, CInputGroupText, CForm, CFormInput, CButton, CButtonGroup} from "@coreui/react" 

const h = React.createElement;
function Group({title, ...props})
{
    return h("section", {
        className:"group",
        style: {
            display: "grid",
            gridTemplateColumns: "auto auto",
            gap: "0 1rem"
        }
    },
        h("h3", {
            style: {
                gridColumn: "1 / -1"
            }
        }, `${title}`),

        props.children
    )
}

function Checkbox({checked, onChange}={})
{

    return h("input", {
            type: "checkbox",
            checked,
            onChange
        });
}

function Knob({label, value, onChange, suffix=""}={})
{

}

function Select({label, ...props}){
    return h("select", null,
        ...props.children
    )
}

function Option({label, active}){
    return h("option", null, 
        label
    );
}

function Accordion({

}){

}

function Tab(){

}

function TabItem(){

}

function TabContent(){

}

function Collapsable(){

}

function Input({
    type="number", // number | text | range | vec2
    value,
    onChange,
    label="",
    suffix="",
    prefix=""
}={}){
    return h("input", {
        type:"number", 
        className:"form-control",
        value: value,
        onChange: onchange
    });
}

function Progress({value})
{

}

function Slider({value, onChange, min, max})
{
    return h("input", {
        className: "slider",
        type: "range", 
        value, 
        min, 
        max,
        onChange
    });
}

function Spinner({value, onChange, min, max})
{
    return h("input", {
        className: "spinner",
        type: "number", 
        value, 
        min, 
        max,
        onChange
    });
}

function InputGroup({label, ...props})
{
    return h("div", {className:"my-input-group"}, 
    
        props.children
    );
}

export {Input, Slider, Spinner, InputGroup, Checkbox, Group, Knob, Select, Option, Accordion, Tab, Collapsable, Progress}