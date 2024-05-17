import entityStore from "../stores/entity-store.js"
import React from "react";
const h = React.createElement;
import Settings from "./Settings.js";
import Animate from "./Animate.js";

function TransformInspector({entityKey, component, values}){
    return h("section", null, 
        h("header", null, "Transform"),
        h("form", null, 
            h("label", null, 
                "translate",
                h("input", {type: "number", value: values.translate.x, onChange: (e)=>entityStore.setValue(`${entityKey}.transform.translate.x`, parseFloat(e.target.value))}),
                h("input", {type: "number", value: values.translate.y, onChange: (e)=>entityStore.setValue(`${entityKey}.transform.translate.y`, parseFloat(e.target.value))})
            ),
            h("label", null, 
                "rotate",   
                h("input", {type: "number", value: values.rotate, onChange: (e)=>entityStore.setValue(`${entityKey}.transform.rotate`, parseFloat(e.target.value))})
            )
        )
    )
}

function CircleInspector({entityKey, component, values})
{
    return h("form", null, 
        h("label", null,
            "radius",
            h("input", {type: "number", value: values.radius})
        )
    )
}

function RectangleInspector({entityKey, component, values})
{
    return h("form", null, 
        h("label", null,
            "width",
            h("input", {type: "number", value: values.width})
        ),
        h("label", null,
            "height",
            h("input", {type: "number", value: values.height})
        )
    )
}

function SphericalLensInspector({entityKey, component, values})
{
    return h("form", null, 
        h("label", null,
            "diameter",
            h("input", {type: "number", value: values.diameter})
        ),
        h("label", null,
            "centerThickness",
            h("input", {type: "number", value: values.centerThickness})
        ),
        h("label", null,
            "edgeThickness",
            h("input", {type: "number", value: values.edgeThickness})
        )
    )
}

function ShapeInspector({entityKey, component, values}){
    return h("section", null, 
        h("header", null, "Shape"),
        h("form", null, 
            h("label", null,
                "type",
                h("select", {name: "shapes"}, 
                    h("option", {value: "circle", selected: values.type=="circle"}, "circle"),
                    h("option", {value: "sphericalLens", selected: values.type=="sphericalLens"}, "sphericalLens"),
                    h("option", {value: "rectangle", selected: values.type=="rectangle"}, "rectangle")
                )
            )
        ),
        {
            "circle": h(CircleInspector, {entityKey, component, values}),
            "sphericalLens": h(SphericalLensInspector, {entityKey, component, values}),
            "rectangle": h(RectangleInspector, {entityKey, component, values})
        }[values.type]
        
    )
}

function MaterialInspector({entityKey, component, values}){
    return h("section", null, 
        h("header", null, "Material"),
        h("form", null, 
            h("label", null,
                "type",
                h("select", {name: "materials", onChange: (e)=>entityStore.setValue(`${entityKey}.material.type`, e.target.value)}, 
                    h("option", {value: "mirror", selected: values.type=="mirror"}, "mirror"),
                    h("option", {value: "diffuse", selected: values.type=="diffuse"}, "diffuse"),
                    h("option", {value: "glass", selected: values.type=="glass"}, "glass")
                )
            )
        ),
    )
}

function LightInspector({
    entityKey, component, values
})
{
    return h("section", null, 
    h("header", null, "Light"),
    h("form", null, 
        h("label", null,
            "intensity",
            h("input", {
                type: "range", 
                value: values.intensity, 
                min: 0.01,
                max: 3.0,
                step: 0.1,
                onChange: e=>entityStore.setValue(`${entityKey}.light.intensity`, parseFloat(e.target.value))
            })
        ),
        h("label", null,
            "temperature",
            h("input", {
                type: "range", 
                value: values.temperature, 
                min: 1000,
                max: 10000,
                step: 100,
                onChange: e=>entityStore.setValue(`${entityKey}.light.temperature`, parseFloat(e.target.value))})
        ),
    ),
)
}

function EntityInspector({entityKey, entity, ...props})
{
    return h("div", {}, 
        h("span", null, `name: '${entityKey}'`),

        Object.entries(entity).map(([component, values])=>{
            switch (component) {
                case "transform":
                    return h(TransformInspector, {entityKey, component, values})
                case "shape":
                    return h(ShapeInspector, {entityKey, component, values})
                case "material":
                    return h(MaterialInspector, {entityKey, component, values})
                case "light":
                    return h(LightInspector, {entityKey, component, values})
                default:
                    return null;
                    return h("div", null, `<No Interface for component: ${component}>`)
            }
        })
    )
}



function Inspector(props)
{
    const scene = React.useSyncExternalStore(entityStore.subscribe, entityStore.getSnapshot);
    const selection = Object.fromEntries(Object.entries(scene).filter(([key, entity])=>{
        return entity.selected ? true : false;
    }));


    return h("div", props,
        h("header", null, "INSPECTOR"),
        Object.keys(selection).length?
            Object.entries(selection).map(([key, entity])=>{
                return h(EntityInspector, {entityKey: key, entity})
            })
            :
            h(Settings)

    );
}
export default Inspector;
