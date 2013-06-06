###
countdown is a simple jquery plugin for countdowns

Dual licensed under the MIT (http://www.opensource.org/licenses/mit-license.php)
and GPL-3.0 (http://opensource.org/licenses/GPL-3.0) licenses.

@source: http://github.com/rendro/countdown/
@autor: Robert Fleischmann
@version: 1.0.1
###

(($) ->
  $.countdown = (el, options) ->

    @el = el
    @$el = $ el
    @$el.data "countdown", @

    @init = =>
      @options = $.extend {}, $.countdown.defaultOptions, options
      if @options.refresh
        @interval = setInterval =>
          @render()
        , @options.refresh
      @render()
      @

    getDateData = (endDate) =>
      endDate = Date.parse if $.isPlainObject @options.date then @options.date else new Date @options.date
      diff = (endDate - Date.parse(new Date)) / 1000

      if diff <= 0
        diff = 0
        @stop() if @interval
        @options.onEnd.apply @

      dateData = {
        years:    0
        days:     0
        hours:    0
        min:      0
        sec:      0
        millisec: 0
      }

      if diff >= (365.25 * 86400)
        dateData.years = Math.floor diff / (365.25 * 86400)
        diff -= dateData.years * 365.25 * 86400

      if diff >= 86400
        dateData.days = Math.floor diff / 86400
        diff -= dateData.days * 86400

      if diff >= 3600
        dateData.hours = Math.floor diff / 3600
        diff -= dateData.hours * 3600

      if diff >= 60
        dateData.min = Math.floor diff / 60
        diff -= dateData.min * 60

      dateData.sec = diff

      dateData

    @leadingZeros = (num, length = 2) =>
      num = String num
      num = "0#{num}" while num.length < length
      num

    @update = (newDate) =>
      @options.date = newDate
      @

    @render = =>
      @options.render.apply @, [getDateData @options.date]
      @

    @stop = =>
      clearInterval @interval if @interval
      @interval = null
      @

    @start = (refresh = @options.refresh or $.countdown.defaultOptions.refresh) =>
      clearInterval @interval if @interval
      @render()
      @options.refresh = refresh
      @interval = setInterval =>
        @render()
      , @options.refresh
      @

    @init()

  $.countdown.defaultOptions =
    date: "June 7, 2087 15:03:25"
    refresh: 1000
    onEnd: $.noop
    render: (date) ->
      $(@el).html "#{date.years} years, #{date.days} days, #{@leadingZeros date.hours} hours, #{@leadingZeros date.min} min and #{@leadingZeros date.sec} sec"

  $.fn.countdown = (options) ->
    $.each @, (i, el) ->
      $el = ($ el)

      unless $el.data 'countdown'
        $el.data 'countdown', new $.countdown el, options

  undefined
)(jQuery)
