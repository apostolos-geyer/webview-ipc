/** @type {import('tailwindcss').Config} */
export const content = ['./app/**/*.{js,jsx,ts,tsx}']
export const presets = [require('nativewind/preset')]
export const theme = { extend: {} }
export const plugins = []
export const corePlugins = { backgroundOpacity: true }
