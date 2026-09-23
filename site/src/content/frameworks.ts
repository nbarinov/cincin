const FRAMEWORKS = ['react', 'preact', 'vue', 'solid', 'angular'] as const;
const DEFAULT_FRAMEWORK: Framework = 'react';
const FRAMEWORK_NAMES: Record<Framework, string> = {
  react: 'React',
  preact: 'Preact',
  vue: 'Vue',
  solid: 'Solid',
  angular: 'Angular',
};

type Framework = (typeof FRAMEWORKS)[number];

function isFramework(value: string): value is Framework {
  return FRAMEWORKS.some((f) => f === value);
}

export { isFramework, FRAMEWORKS, DEFAULT_FRAMEWORK, FRAMEWORK_NAMES };
