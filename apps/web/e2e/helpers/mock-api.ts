import type { Page, Route } from '@playwright/test';
import type {
  GameSessionRecord,
  OrchestratedRoundRecord,
} from '@llm-sim/shared-types';

import type { MockApiState } from './fixtures';

const apiBaseUrl = 'http://127.0.0.1:3100/api';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function noContent(route: Route) {
  await route.fulfill({
    status: 204,
    body: '',
  });
}

function buildSummary(session: GameSessionRecord) {
  return {
    id: session.id,
    name: session.name,
    status: session.status,
    currentRound: session.currentRound,
  };
}

export interface MockMutationSuccess<TResponse> {
  delayMs?: number;
  nextState?: MockApiState;
  response?: TResponse;
}

export interface MockMutationFailure {
  delayMs?: number;
  status: number;
  message: string;
}

type MockMutation<TResponse> =
  | {
      type: 'success';
      config: MockMutationSuccess<TResponse>;
    }
  | {
      type: 'failure';
      config: MockMutationFailure;
    };

export interface MockApiScenario {
  initial: MockApiState;
  orchestrate?: MockMutation<OrchestratedRoundRecord>;
  advanceRound?: MockMutation<GameSessionRecord>;
}

async function applyMutation<TResponse>(
  route: Route,
  mutation: MockMutation<TResponse> | undefined,
  currentState: { value: MockApiState },
  fallbackResponse: () => TResponse,
) {
  if (!mutation) {
    await json(route, fallbackResponse());
    return;
  }

  if (mutation.type === 'failure') {
    if (mutation.config.delayMs) {
      await new Promise((resolve) =>
        setTimeout(resolve, mutation.config.delayMs),
      );
    }
    await json(
      route,
      {
        statusCode: mutation.config.status,
        message: mutation.config.message,
      },
      mutation.config.status,
    );
    return;
  }

  if (mutation.config.delayMs) {
    await new Promise((resolve) =>
      setTimeout(resolve, mutation.config.delayMs),
    );
  }

  if (mutation.config.nextState) {
    currentState.value = clone(mutation.config.nextState);
  }

  await json(route, mutation.config.response ?? fallbackResponse());
}

export async function mockSessionApiScenario(
  page: Page,
  scenario: MockApiScenario,
) {
  const currentState = {
    value: clone(scenario.initial),
  };

  await page.route(`${apiBaseUrl}/agents/sessions/**/events`, noContent);

  await page.route(`${apiBaseUrl}/game/sessions`, async (route) => {
    const request = route.request();

    if (request.method() !== 'GET') {
      await route.fallback();
      return;
    }

    await json(
      route,
      currentState.value.sessions ?? [buildSummary(currentState.value.session)],
    );
  });

  await page.route(
    `${apiBaseUrl}/game/sessions/*/rounds/advance`,
    async (route) => {
      if (route.request().method() !== 'PATCH') {
        await route.fallback();
        return;
      }

      await applyMutation(route, scenario.advanceRound, currentState, () => {
        return currentState.value.session;
      });
    },
  );

  await page.route(
    `${apiBaseUrl}/agents/sessions/*/rounds/orchestrate`,
    async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }

      await applyMutation(route, scenario.orchestrate, currentState, () => {
        return {
          gameSessionId: currentState.value.session.id,
          roundNumber: currentState.value.session.currentRound,
          turns: [],
        };
      });
    },
  );

  await page.route(`${apiBaseUrl}/game/sessions/*`, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }

    await json(route, currentState.value.session);
  });

  await page.route(`${apiBaseUrl}/replay/sessions/*`, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }

    await json(route, currentState.value.replay);
  });
}
