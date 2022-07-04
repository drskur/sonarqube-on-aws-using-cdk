import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SonarQubeStack } from '../src/sonar-qube-stack';

test('Snapshot', () => {
  const app = new App();
  const stack = new SonarQubeStack(app, 'test');

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});