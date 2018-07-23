Ext.define("CArABU.app.Colors", {
    
    singleton: true, 
    
    // RGB values obtained from here: http://ux-blog.rallydev.com/?cat=23
    amber: "#ffbf00",
    gray: "#808080",
    green: "#008000",
    red: "#ff0000",
    blue: "#0000ff",
    grey4: "#C0C0C0",  // $grey4
    orange: "#FF8200",  // $orange
    gold: "#F6A900",  // $gold
    yellow: "#FAD200",  // $yellow
    lime: "#8DC63F",  // $lime
    green_dk: "#1E7C00",  // $green_dk
    blue_link: "#337EC6",  // $blue_link
    blue_dark: '#00386e', 
    blue_light: '#b2cee9',
    purple : "#7832A5",  // $purple,
    pink : "#DA1884",   // $pink,
    grey7 : "#666",
    white : "#f5f5f5",

    getColor:function(name){
        return this[name];
    }
});