import { from, map, of, switchMap } from 'rxjs';
import { Utils } from 'vscode-uri';
import { storiesGlobsConfigSuffix } from '../constants/constants';
import { getStoriesGlobs } from '../storybook/getStoriesGlobs';
import { isValidStoriesConfigItem } from '../storybook/isValidStoriesConfigItem';
import { ensureArray } from '../util/ensureArray';
import { deferAndShare } from '../util/rxjs/deferAndShare';
import { distinctUntilNotStrictEqual } from '../util/rxjs/distinctUntilNotStrictEqual';
import { fromVsCodeSetting } from '../util/rxjs/fromVsCodeSetting';
import { workspaceRoot } from '../util/workspaceRoot';
import { interpretStoriesConfigItem } from './normalizeStoriesEntry';
import { storybookConfig } from './storybookConfig';

const defaultStoriesGlobSetting = null;

const storiesGlobsSetting = fromVsCodeSetting(storiesGlobsConfigSuffix).pipe(
  map((rawValue) => {
    if (rawValue === defaultStoriesGlobSetting) {
      return undefined;
    }

    return ensureArray(rawValue).filter(isValidStoriesConfigItem);
  }),
);

/**
 * Globs to use to select story files.
 */
export const storiesGlobs = deferAndShare(() =>
  storiesGlobsSetting.pipe(
    switchMap((setting) => {
      if (setting) {
        return workspaceRoot.pipe(
          map((root) => ({ stories: setting, dir: root })),
        );
      }

      return storybookConfig.pipe(
        map((result) => {
          if (!result?.config) {
            return undefined;
          }

          const configDir = Utils.dirname(result.uri);

          return { stories: result.config.stories, dir: configDir };
        }),
      );
    }),
    distinctUntilNotStrictEqual(),
    switchMap((result) => {
      if (!result?.dir) {
        return of(undefined);
      }

      const { stories, dir } = result;

      return from(getStoriesGlobs(stories)).pipe(
        switchMap((storiesConfigItems) =>
          from(
            Promise.all(
              storiesConfigItems.map((configItem) =>
                interpretStoriesConfigItem(configItem, dir),
              ),
            ),
          ),
        ),
      );
    }),
    distinctUntilNotStrictEqual(),
  ),
);
