

"Async" component uses new `instance.callback` functionality that alows it to send some data to connected component and get some data back.

example:
```javascript
var outputindex = 0;
var data = instance.make({ some:'data' });

instance.callback(outputindex, data, function(data){
	//'data' should be the same instance of the flowdata 
	//created by the instance.make function above

});
```

the connected component must use new 'next' function instead of instance.send

example:
```javascript
instance.on('0', function(flowdata, next){
	// 'next' is the callback passed in to the instance.callback function
	// or a reference to the instance.send if the data were send by 'instance.send' function

	var data = getsomeData();
	flowdata.data = data;
	// always make sure to use the same flowdata instance if possible
	next(flowdata);

	// or shorter alternative
	var data = getsomeData();
	next(flowdata.rewrite(data));
});
```