import React from "react"

const h = React.createElement;

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

export default FA