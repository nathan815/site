var assert = require('assert');
import { arrHas, htmlEntities } from './../src/js/helpers.js';

describe('helpers', function() {
    describe('arrHas', function() {
        let arr = [];
        beforeEach(function() {
            arr = [4, 10, "hi", true, 200];
        });
        it('returns true if it contains the given value', function() {
            assert(arrHas(arr, 10));
        });
        it('returns false if it does not contain the given value', function() {
            assert.equal(arrHas(arr, 42), false);
        });
    });
    describe('htmlEntities', function() {
        it('returns a string with characters properly encoded', function() {
            assert.equal(htmlEntities('<b>"hello &there"</b>'), '&lt;b&gt;&quot;hello &amp;there&quot;&lt;/b&gt;');
        });
    });
});