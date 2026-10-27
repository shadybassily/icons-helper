import { describe, expect, it } from 'vitest';
import { iconMatchesType, iconMatchesTypes } from './icon-categories';

describe('iconMatchesType', () => {
  it('groups check / success names', () => {
    expect(iconMatchesType('check-mark', 'check')).toBe(true);
    expect(iconMatchesType('circle-checked', 'check')).toBe(true);
    expect(iconMatchesType('checkbox', 'check')).toBe(true);
    expect(iconMatchesType('user-approved', 'check')).toBe(true);
    expect(iconMatchesType('offset_check_circle', 'check')).toBe(true);
    expect(iconMatchesType('filter', 'check')).toBe(false);
  });

  it('groups warnings', () => {
    expect(iconMatchesType('warning-triangle', 'warnings')).toBe(true);
    expect(iconMatchesType('alert-octagon', 'warnings')).toBe(true);
    expect(iconMatchesType('high-risk', 'warnings')).toBe(true);
    expect(iconMatchesType('bell-alert', 'warnings')).toBe(true);
    expect(iconMatchesType('bell', 'warnings')).toBe(false);
  });

  it('groups close / cross names', () => {
    expect(iconMatchesType('close', 'cross')).toBe(true);
    expect(iconMatchesType('circle-close', 'cross')).toBe(true);
    expect(iconMatchesType('person-cross', 'cross')).toBe(true);
    expect(iconMatchesType('calendar-x', 'cross')).toBe(true);
    expect(iconMatchesType('user-rejected', 'cross')).toBe(true);
    expect(iconMatchesType('flex', 'cross')).toBe(false);
  });

  it('groups documents without matching paperclip or filter', () => {
    expect(iconMatchesType('documents', 'documents')).toBe(true);
    expect(iconMatchesType('file-plus', 'documents')).toBe(true);
    expect(iconMatchesType('clipboard-text', 'documents')).toBe(true);
    expect(iconMatchesType('filled-paper-checked', 'documents')).toBe(true);
    expect(iconMatchesType('paperclip', 'documents')).toBe(false);
    expect(iconMatchesType('filter', 'documents')).toBe(false);
  });

  it('groups people / users', () => {
    expect(iconMatchesType('user-plus', 'users')).toBe(true);
    expect(iconMatchesType('students', 'users')).toBe(true);
    expect(iconMatchesType('unassign-teacher', 'users')).toBe(true);
    expect(iconMatchesType('families', 'users')).toBe(true);
    expect(iconMatchesType('rocket', 'users')).toBe(false);
  });

  it('groups calendars', () => {
    expect(iconMatchesType('calendar', 'calendar')).toBe(true);
    expect(iconMatchesType('multiple-calendars', 'calendar')).toBe(true);
    expect(iconMatchesType('calendar-checked', 'calendar')).toBe(true);
    expect(iconMatchesType('sand-clock', 'calendar')).toBe(false);
  });

  it('groups arrows and chevrons', () => {
    expect(iconMatchesType('arrow-left', 'arrows')).toBe(true);
    expect(iconMatchesType('arrows-hv', 'arrows')).toBe(true);
    expect(iconMatchesType('circle-arrow-top-right', 'arrows')).toBe(true);
    expect(iconMatchesType('chevron-right', 'arrows')).toBe(true);
    expect(iconMatchesType('double-chevrons-top', 'arrows')).toBe(true);
    expect(iconMatchesType('return', 'arrows')).toBe(false);
  });
});

describe('iconMatchesTypes', () => {
  it('shows everything when no type is selected', () => {
    expect(iconMatchesTypes('rocket', [])).toBe(true);
  });

  it('ORs selected types so an icon can match more than one', () => {
    expect(iconMatchesTypes('user-rejected', ['users', 'cross'])).toBe(true);
    expect(iconMatchesTypes('user-rejected', ['calendar'])).toBe(false);
    expect(iconMatchesTypes('calendar-x', ['calendar', 'cross'])).toBe(true);
  });
});
