import { expect, test } from 'bun:test';
import { labelSpec, lengthSuggestions, partById, sizeSuggestions } from '../public/misc/drawer-labels/parts.js';

const spec = (id, fields) => labelSpec(partById(id), fields);

test('sizes and lengths read the way the drawer labels do', () => {
  expect(spec('hex', { size: '1/4-20', length: '1' })).toEqual({ icon: 'hex', top: '1/4-20×1"', bottom: '' });
  expect(spec('flat-phillips', { size: '1/4-20', length: '1 1/4"' })).toEqual({ icon: 'flat-phillips', top: '1/4-20×1-1/4"', bottom: '' });
  expect(spec('socket', { size: 'm4', length: '35 mm' })).toEqual({ icon: 'socket', top: 'M4×35mm', bottom: '' });
  expect(spec('combo', { size: '#12-24', length: '1 in' })).toEqual({ icon: 'combo', top: '#12-24×1"', bottom: '' });
  expect(spec('wood', { size: '10', length: '7/8', bottom: 'WOOD' })).toEqual({ icon: 'flat-phillips', top: '#10×7/8"', bottom: 'WOOD' });
  expect(spec('nut', { size: '1/4-20', length: '2' })).toEqual({ icon: 'nut', top: '1/4-20', bottom: '' });
  expect(spec('washer', { size: '5/16', bottom: 'FLAT WASHER' })).toEqual({ icon: 'washer', top: '5/16"', bottom: 'FLAT WASHER' });
  expect(spec('washer', { size: '#10', bottom: 'FLAT WASHER' }).top).toBe('#10');
  expect(spec('text', { top: '  M8   spare ', bottom: 'SS' })).toEqual({ icon: 'none', top: 'M8 spare', bottom: 'SS' });
});

test('a size without a length is the size alone', () => {
  expect(spec('hex', { size: 'M6', length: '' }).top).toBe('M6');
  expect(spec('hex', { size: '', length: '20' }).top).toBe('');
});

test('suggestions follow the part and the size', () => {
  expect(sizeSuggestions(partById('wood'))).toContain('#10');
  expect(sizeSuggestions(partById('hex'))).toContain('1/4-20');
  expect(lengthSuggestions(partById('hex'), 'M4')).toContain('35');
  expect(lengthSuggestions(partById('hex'), '1/4-20')).toContain('1-1/4');
  expect(lengthSuggestions(partById('nut'), 'M4')).toEqual([]);
});
