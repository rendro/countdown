# countdown

countdown is a jQuery plugin to render countdowns. Instead of unicorns this plugin does not have any magic, but if you like countdowns to be rendered the way you want, this plugin might become your best friend.

## Uber simple setup

To use the countdown plugin you need to load the current version of jQuery (tested with 1.7.2) and the javascript file of the plugin.
Just add the following lines to the `head` of your website:

```html
<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js"></script>
<script type="text/javascript" src="/path/to/jquery.countdown.js"></script>
```

Then you have to initialize the plugin with your desired configuration:

```js
$(function() {
    $('.yourCountdownContainer').countdown({
        date: "June 7, 2087 15:03:26"
    });
});
```

Yep, it's easy like that! Enjoy the time you saved!

## Options

You can pass a set of these options to set a custom behaviour and look for the plugin.

<table>
    <tr>
        <th>Property (Type)</th>
        <th>Default</th>
        <th>Description</th>
    </tr>
    <tr>
        <td><strong>date</strong></td>
        <td>new Date("June 7, 2087 15:03:25")</td>
        <td>The end time of your fancy countdown. Pass either a date object or a string/integer that will be used to create a new Date object. <a href="https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Date" target="_blank">Here</a> you can find all accepted formats of this value.</td>
    </tr>
    <tr>
        <td><strong>refresh</strong></td>
        <td>1000</td>
        <td>Refresh rate in milliseconds or false to avoid automatic updates.</td>
    </tr>
    <tr>
        <td><strong>render</strong></td>
        <td colspan="2">With the render option you can set a function to change the output of the plugin. This function is called in the scope of the plugin, so you can access the <code>leadingZeros</code> method to format numbers as well as public variables and methods. A literal object will be passed to this function as an argument, containing the remaining time parts (years, days, hours, min, sec).</td>
    </tr>
    <tr>
        <td><strong>onEnd</strong></td>
        <td colspan="2">Callback function that is called when the end date is reached</td>
    </tr>
    <tr>
    	<td><strong>offset</strong></td>
        <td colspan="2">A period of time (in milliseconds) that is used as offset in time difference calculation between <em>now</em> and <em>end time</em>. Useful if countdown calculation to <em>end time</em> is imprecise due to user's date and time settings.</td>
    </tr>
</table>

## Public plugin methods

<table>
    <tr>
        <th>method(arguments)</th>
        <th>Description</th>
    </tr>
    <tr>
        <td><strong>leadingZeros</strong>(<em>number, [length = 2]</em>)</td>
        <td>Add leading zeros to a number.</td>
    </tr>
    <tr>
        <td><strong>update</strong>(<em>newDate</em>)</td>
        <td>Update the end time. The possible formats of the argument <code>newDate</code> are the same as described in the <code>date</code>-option above.</td>
    </tr>
    <tr>
        <td><strong>updateOffset</strong>(<em>newOffset</em>)</td>
        <td>Update the offset (time in milliseconds).</td>
    </tr>
    <tr>
        <td><strong>render</strong>()</td>
        <td>Call the render method. This might be usefull if you set <code>refresh</code> to false.</td>
    </tr>
    <tr>
        <td><strong>stop</strong>()</td>
        <td>Stops the refresh loop.</td>
    </tr>
    <tr>
        <td><strong>start</strong>(<em>[refreshRate]</em>)</td>
        <td>Start the refresh loop. If you set a refresh rate in the options you can overwrite it with the argument <code>refreshRate</code>. If you don't pass an argument, the old value or the default value of 1 sec will be used.</td>
    </tr>
</table>

## Changelog

### Version 2.1.0 - <small>Oct 13, 2014</small>
* Added time offset option to fix time differences between server and client time (#8)

### Version 2.0.0 - <small>Oct 13, 2014</small>
* removed coffee-script dependency
* added vanilla version
* add UMD wrapper (commonJS, require.js, global)
* added support to define the end date with the data-date attribute (#14)

### Version 1.0.1 - <small>May 01, 2013</small>
* Added callback function when the end date is reached

### Version 1.0.0 - <small>Aug 05, 2012</small>
* Initial release

## License

`countdown` is dual licensed under the [MIT](http://www.opensource.org/licenses/mit-license.php) and [GPL-3.0](http://opensource.org/licenses/GPL-3.0) licenses.
