import * as cdk from '@aws-cdk/core';
import * as gw from '@aws-cdk/aws-apigateway';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as sfnTasks from '@aws-cdk/aws-stepfunctions-tasks';

export class StepfunctionsSlackStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const url = this.node.tryGetContext('url');

    const resourceName = 'messages';

    const api = new gw.RestApi(this, 'SlackIncomingWebhook', {
      defaultIntegration: new gw.HttpIntegration(url, { httpMethod: 'POST' }),
      endpointTypes: [gw.EndpointType.REGIONAL],
    });

    const resource = api.root.addResource(resourceName);
    resource.addMethod('POST', undefined, {
      authorizationType: gw.AuthorizationType.IAM,
    });

    const stateInit = new sfn.Pass(this, 'Initialize', {
      result: sfn.Result.fromObject({ text: 'Hello, World!' }),
      resultPath: '$.message',
    });

    const statePostMessage = new sfnTasks.CallApiGatewayRestApiEndpoint(this, 'PostMessage', {
      api,
      apiPath: `/${resourceName}`,
      stageName: api.deploymentStage.stageName,
      method: sfnTasks.HttpMethod.POST,
      requestBody: sfn.TaskInput.fromContextAt('$.message'),
      authType: sfnTasks.AuthType.IAM_ROLE,
    });

    new sfn.StateMachine(this, 'StateMachine', {
      stateMachineName: 'SlackStateMachine',
      definition: stateInit.next(statePostMessage),
    });
  }
}
