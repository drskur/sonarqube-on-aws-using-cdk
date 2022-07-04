import { AwsCdkTypeScriptApp } from 'projen/lib/awscdk';

const project = new AwsCdkTypeScriptApp({
  cdkVersion: '2.30.0',
  authorName: 'drskur',
  authorEmail: 'drskur@amazon.com',
  defaultReleaseBranch: 'main',
  name: 'sonarqube-on-aws-using-cdk',
  projenrcTs: true,
  description: 'this project deploy sonarqube service using cdk',
});
project.addGitIgnore('.idea');

project.synth();