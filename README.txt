Static Ding is a javascript bookmarklet that walks the DOM looking for HTML
elements with a "position" property set to "fixed".  If it finds any, it changes
the position property's value to "relative".

Static Nuke is an almost identical bookmarklet that does the same thing, and
also sets the "display" property to "none" and the "opacity" to 0.

Static Ding and Static Nuke share the same code, except either "D" or "N" (for
"ding" or "nuke") is passed as the "mode" parameter of the bookmarklet's
encompassing function (an "immediately invoked function expression").  "Ding" is
the default mode if any value other than "N" is passed as the mode parameter.

(Yes, the word "static" in "Static Ding" is a misnomer in relation to the CSS
"position" value by the same name.)
