import { defer, filter, map, share, startWith } from 'rxjs';
import { ConfigurationScope, workspace } from 'vscode';
import { configPrefix } from '../../constants/constants';
import { makeFullConfigName } from '../makeFullConfigName';
import { fromVsCodeEvent } from './fromVsCodeEvent';

const settingsChange = defer(() =>
  fromVsCodeEvent(workspace.onDidChangeConfiguration),
).pipe(share());

export const fromVsCodeSetting = <T>(
  settingName: string,
  {
    readFirst = true,
    scope,
  }: { readFirst?: boolean; scope?: ConfigurationScope } = {},
) => {
  const readSetting = () =>
    workspace.getConfiguration(configPrefix, scope).get<T>(settingName);

  const settingChange = settingsChange.pipe(
    filter((e) => e.affectsConfiguration(makeFullConfigName(settingName))),
    map(readSetting),
  );

  return readFirst
    ? settingChange.pipe(startWith(readSetting()))
    : settingChange;
};
