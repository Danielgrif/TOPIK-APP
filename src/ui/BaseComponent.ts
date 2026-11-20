import { subscribe, StateEvent } from "../core/state.ts";

export abstract class BaseComponent {
  /** Все созданные компоненты — используется для отложенной инициализации после вставки HTML. */
  private static readonly instances = new Set<BaseComponent>();

  private readonly elementId: string;
  private initialized = false;

  protected element: HTMLElement;
  private subscriptions: (() => void)[] = [];
  private eventListeners: {
    element: EventTarget;
    type: string;
    handler: EventListener;
  }[] = [];

  constructor(elementId: string) {
    this.elementId = elementId;
    const el = document.getElementById(elementId);
    if (!el) {
      // Non-critical, as some components might be optional
      this.element = document.createElement("div"); // Assign a dummy element to prevent crashes and silence warning for lazy init
    } else {
      this.element = el;
    }
    BaseComponent.instances.add(this);
  }

  /**
   * Инициализирует ещё не инициализированные компоненты.
   * Вызывается после инъекции HTML-шаблонов (см. component_loader.ts).
   */
  public static initAll(): void {
    BaseComponent.instances.forEach((component) => {
      if (!component.isInitialized()) component.init();
    });
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Initializes the component, sets up state subscriptions and event listeners.
   * Should be called after the component is constructed.
   * Повторные вызовы игнорируются, чтобы не дублировать подписки и обработчики.
   */
  public init(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Компонент мог быть создан до вставки шаблона — подтягиваем реальный элемент.
    if (!this.element.id || !document.body.contains(this.element)) {
      const el = document.getElementById(this.elementId);
      if (el) this.element = el;
    }

    this.setupEventListeners();
    this.setupStateSubscriptions();
    this.render();
  }

  /**
   * Abstract method to render the component's UI.
   * Must be implemented by child classes.
   */
  protected abstract render(): void;

  /**
   * Optional method to set up DOM event listeners.
   */
  protected setupEventListeners(): void {
    // To be implemented by child classes
  }

  /**
   * Optional method to set up state change subscriptions.
   */
  protected setupStateSubscriptions(): void {
    // To be implemented by child classes
  }

  /**
   * Cleans up all subscriptions and event listeners to prevent memory leaks.
   */
  public destroy(): void {
    this.subscriptions.forEach((unsubscribe) => unsubscribe());
    this.subscriptions = [];

    this.eventListeners.forEach(({ element, type, handler }) => {
      element.removeEventListener(type, handler);
    });
    this.eventListeners = [];
    this.initialized = false;
  }

  /**
   * Helper to subscribe to state changes. Automatically tracks subscriptions for cleanup.
   * Callback вызывается только для запрошенного события (или для всех при event === "*").
   */
  protected listen(
    event: StateEvent | "*",
    listener: (event: StateEvent, payload?: unknown) => void,
  ): void {
    const unsubscribe = subscribe((receivedEvent, payload) => {
      if (event === "*" || receivedEvent === event) {
        listener(receivedEvent, payload);
      }
    });
    this.subscriptions.push(unsubscribe);

    // Совместимость: часть кода диспатчит DOM-событие "state-changed" вместо notify("state_changed").
    if (event === "state_changed") {
      this.addEvent(document, "state-changed", () => listener("state_changed", undefined));
    }
  }

  /**
   * Helper to add an event listener. Automatically tracks listeners for cleanup.
   */
  protected addEvent(element: EventTarget, type: string, handler: EventListener): void {
    element.addEventListener(type, handler);
    this.eventListeners.push({ element, type, handler });
  }

  /**
   * Query selector scoped to the component's root element.
   */
  protected $<T extends HTMLElement>(selector: string): T | null {
    return this.element.querySelector<T>(selector);
  }

  /**
   * Query selector all scoped to the component's root element.
   */
  protected $$<T extends HTMLElement>(selector: string): NodeListOf<T> {
    return this.element.querySelectorAll<T>(selector);
  }
}
