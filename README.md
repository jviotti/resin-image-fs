resin-image-fs
--------------

[![npm version](https://badge.fury.io/js/resin-image-fs.svg)](http://badge.fury.io/js/resin-image-fs)
[![dependencies](https://david-dm.org/resin-io/resin-image-fs.png)](https://david-dm.org/resin-io/resin-image-fs.png)
[![Build Status](https://travis-ci.org/resin-io/resin-image-fs.svg?branch=master)](https://travis-ci.org/resin-io/resin-image-fs)
[![Build status](https://ci.appveyor.com/api/projects/status/86bot1jaepcg5xlv?svg=true)](https://ci.appveyor.com/project/resin-io/resin-image-fs)

Resin.io image filesystem manipulation utilities.

Role
----

The intention of this module is to provide low level utilities to Resin.io operating system data partitions.

**THIS MODULE IS LOW LEVEL AND IS NOT MEANT TO BE USED BY END USERS DIRECTLY**.

Installation
------------

Install `resin-image-fs` by running:

```sh
$ npm install --save resin-image-fs
```

Documentation
-------------

<a name="module_imagefs..interact"></a>

### imagefs~interact()
**Kind**: inner method of [<code>imagefs</code>](#module_imagefs)  
**Summary**: Run a function with a node fs like interface for a partition  
**Example**  
```js
const contents = await interact('/foo/bar.img', 5, async (fs) => {
	return await promisify(fs.readFile)('/bar/qux');
});
console.log(contents);
```

Support
-------

If you're having any problem, please [raise an issue](https://github.com/resin-io/resin-image-fs/issues/new) on GitHub and the Resin.io team will be happy to help.

Tests
-----

Run the test suite by doing:

```sh
$ npm test
```

Contribute
----------

- Issue Tracker: [github.com/resin-io/resin-image-fs/issues](https://github.com/resin-io/resin-image-fs/issues)
- Source Code: [github.com/resin-io/resin-image-fs](https://github.com/resin-io/resin-image-fs)

License
-------

The project is licensed under the Apache 2.0 license.
