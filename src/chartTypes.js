'use strict';

angular.module('vleApp')
  .constant('Marks', function() {
  	var includeZero = {
		name: 'zero',
		default: true,
		type: 'bool',
		property: 'scale'
	}

	var reverse = {
		name: 'reverse',
		default: false,
		type: 'bool',
		property: 'scale'
	}

	var type = {
		name: 'type',
		default: 'linear',
		type: 'choice',
		choices: ['linear', 'logarithmic', 'power', 'quantile'],
		property: 'scale'
	}

	var margin = {
		name: 'margin',
		default: 80,
		type: 'integer',
		property: 'axis'
	}

	var weight = {
		name: 'weight',
		default: 'normal',
		type: 'choice',
		choices: ['normal', 'bold'],
		property: 'text'
	}

	var size = {
		name: 'size',
		default: 10,
		type: 'integer',
		property: 'font'
	}

	var font = {
		name: 'name',
		default: 'Halvetica Neue',
		type: 'string',
		property: 'font'
	}

	var marks = [
		{
			name: 'x',
			config: {
				Q: [includeZero,
					reverse,
					type,
					margin],
				O: [reverse,
					margin],
				T: [reverse,
					type,
					margin]
			}
		},{
			name: 'y',
			config: {
				Q: [includeZero,
					reverse,
					type,
					margin],
				O: [reverse,
					margin],
				T: [reverse,
					type,
					margin]
			}
		},{
			name: 'row',
			config: {
				O: [reverse]
			}
		},{
			name: 'col',
			config: {
				O: [reverse]
			}
		},{
			name: 'size',
			config: {
				Q: [includeZero,
					reverse,
					type],
				O: [reverse],
				T: [reverse,
					type]
			}
		},{
			name: 'color',
			config: {
				Q: [includeZero,
					reverse,
					type],
				O: [reverse],
				T: [reverse,
					type]
			}
		},{
			name: 'alpha',
			config: {
				Q: [includeZero,
					reverse,
					type],
				O: [reverse],
				T: [reverse,
					type]
			}
		},{
			name: 'shape',
			config: {
				O: []
			}
		},{
			name: 'text',
			config: {
				Q: [weight, size, font],
				O: [weight, size, font],
				T: [weight, size, font]
			}
		}
	]

	marks = _.map(marks, function(mark) {
		return {
			name: mark.name,
			config: _.mapValues(mark.config, function(config) {
				return _.chain(config).groupBy('property').omit('property').value();
			})}
	});

  	return marks;
  }());