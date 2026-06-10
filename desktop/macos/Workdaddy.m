// charset: utf-8
#import <Cocoa/Cocoa.h>
#import <UniformTypeIdentifiers/UniformTypeIdentifiers.h>
#import <WebKit/WebKit.h>

@interface NativeFileSystemBridge : NSObject <WKScriptMessageHandler, WKScriptMessageHandlerWithReply>
@property(nonatomic, strong) NSMutableDictionary<NSString *, NSURL *> *handles;
@end

@implementation NativeFileSystemBridge

- (instancetype)init {
  self = [super init];
  if (self) {
    _handles = [NSMutableDictionary dictionary];
  }
  return self;
}

- (void)userContentController:(WKUserContentController *)userContentController
      didReceiveScriptMessage:(WKScriptMessage *)message
                  replyHandler:(void (^)(id _Nullable reply, NSString *_Nullable errorMessage))replyHandler {
  if (![message.body isKindOfClass:[NSDictionary class]]) {
    replyHandler(nil, @"Invalid native file system request.");
    return;
  }

  NSDictionary *body = (NSDictionary *)message.body;
  NSString *action = body[@"action"];
  if (![action isKindOfClass:[NSString class]]) {
    replyHandler(nil, @"Invalid native file system request.");
    return;
  }

  dispatch_async(dispatch_get_main_queue(), ^{
    if ([action isEqualToString:@"open"]) {
      [self openWithBody:body replyHandler:replyHandler];
    } else if ([action isEqualToString:@"openDefault"]) {
      [self openDefaultWithBody:body replyHandler:replyHandler];
    } else if ([action isEqualToString:@"read"]) {
      [self readWithBody:body replyHandler:replyHandler];
    } else if ([action isEqualToString:@"save"]) {
      [self saveWithBody:body replyHandler:replyHandler];
    } else if ([action isEqualToString:@"write"]) {
      [self writeWithBody:body replyHandler:replyHandler];
    } else {
      replyHandler(nil, [NSString stringWithFormat:@"Unknown native file system action: %@", action]);
    }
  });
}

- (void)openWithBody:(NSDictionary *)body
        replyHandler:(void (^)(id _Nullable reply, NSString *_Nullable errorMessage))replyHandler {
  NSOpenPanel *panel = [NSOpenPanel openPanel];
  panel.canChooseFiles = YES;
  panel.canChooseDirectories = NO;
  panel.allowsMultipleSelection = [body[@"multiple"] boolValue];
  panel.allowedContentTypes = [self contentTypesFromBody:body];

  if ([panel runModal] != NSModalResponseOK) {
    replyHandler(@{ @"cancelled" : @YES }, nil);
    return;
  }

  NSMutableArray *files = [NSMutableArray array];
  for (NSURL *url in panel.URLs) {
    NSError *error = nil;
    NSData *data = [NSData dataWithContentsOfURL:url options:0 error:&error];
    if (!data) {
      replyHandler(nil, error.localizedDescription);
      return;
    }

    NSString *identifier = NSUUID.UUID.UUIDString;
    self.handles[identifier] = url;
    NSString *bookmark = [self bookmarkStringForURL:url error:&error];
    if (!bookmark) {
      replyHandler(nil, error.localizedDescription);
      return;
    }
    [files addObject:@{
      @"id" : identifier,
      @"name" : url.lastPathComponent,
      @"bookmark" : bookmark,
      @"data" : [data base64EncodedStringWithOptions:0]
    }];
  }

  replyHandler(@{ @"files" : files }, nil);
}

- (void)saveWithBody:(NSDictionary *)body
        replyHandler:(void (^)(id _Nullable reply, NSString *_Nullable errorMessage))replyHandler {
  NSSavePanel *panel = [NSSavePanel savePanel];
  NSString *suggestedName = body[@"suggestedName"];
  panel.nameFieldStringValue = [suggestedName isKindOfClass:[NSString class]] ? suggestedName : @"Untitled";
  panel.allowedContentTypes = [self contentTypesFromBody:body];

  if ([panel runModal] != NSModalResponseOK || !panel.URL) {
    replyHandler(@{ @"cancelled" : @YES }, nil);
    return;
  }

  NSString *identifier = NSUUID.UUID.UUIDString;
  self.handles[identifier] = panel.URL;
  NSError *error = nil;
  NSString *bookmark = [self bookmarkStringForURL:panel.URL error:&error];
  if (!bookmark) {
    replyHandler(nil, error.localizedDescription);
    return;
  }

  replyHandler(@{
    @"id" : identifier,
    @"name" : panel.URL.lastPathComponent,
    @"bookmark" : bookmark
  }, nil);
}

- (void)openDefaultWithBody:(NSDictionary *)body
               replyHandler:(void (^)(id _Nullable reply, NSString *_Nullable errorMessage))replyHandler {
  NSString *fileName = body[@"fileName"];
  if (![fileName isKindOfClass:[NSString class]] || fileName.length == 0) {
    replyHandler(nil, @"Invalid default file name.");
    return;
  }

  NSURL *desktopDirectory = [[[NSFileManager defaultManager] URLsForDirectory:NSDesktopDirectory
                                                                    inDomains:NSUserDomainMask] firstObject];
  NSURL *fileURL = [desktopDirectory URLByAppendingPathComponent:fileName];
  if (!fileURL || ![[NSFileManager defaultManager] fileExistsAtPath:fileURL.path]) {
    replyHandler(@{ @"missing" : @YES }, nil);
    return;
  }

  NSError *error = nil;
  NSData *data = [NSData dataWithContentsOfURL:fileURL options:0 error:&error];
  if (!data) {
    replyHandler(nil, error.localizedDescription);
    return;
  }

  NSString *identifier = [self identifierForURL:fileURL];
  NSString *bookmark = [self bookmarkStringForURL:fileURL error:&error];
  if (!bookmark) {
    replyHandler(nil, error.localizedDescription);
    return;
  }

  replyHandler(@{
    @"id" : identifier,
    @"name" : fileURL.lastPathComponent,
    @"bookmark" : bookmark,
    @"data" : [data base64EncodedStringWithOptions:0]
  }, nil);
}

- (void)readWithBody:(NSDictionary *)body
        replyHandler:(void (^)(id _Nullable reply, NSString *_Nullable errorMessage))replyHandler {
  NSError *error = nil;
  NSURL *url = [self resolveURLForBody:body error:&error];
  if (!url) {
    replyHandler(nil, error.localizedDescription);
    return;
  }

  NSData *data = [NSData dataWithContentsOfURL:url options:0 error:&error];
  if (!data) {
    replyHandler(nil, error.localizedDescription);
    return;
  }

  NSString *identifier = [self identifierForURL:url];
  NSString *bookmark = [self bookmarkStringForURL:url error:&error];
  if (!bookmark) {
    replyHandler(nil, error.localizedDescription);
    return;
  }

  replyHandler(@{
    @"id" : identifier,
    @"name" : url.lastPathComponent,
    @"bookmark" : bookmark,
    @"data" : [data base64EncodedStringWithOptions:0]
  }, nil);
}

- (void)writeWithBody:(NSDictionary *)body
         replyHandler:(void (^)(id _Nullable reply, NSString *_Nullable errorMessage))replyHandler {
  NSString *base64 = body[@"data"];
  NSError *error = nil;
  NSURL *url = [self resolveURLForBody:body error:&error];
  if (!url) {
    replyHandler(nil, error.localizedDescription);
    return;
  }

  NSData *data = [[NSData alloc] initWithBase64EncodedString:base64 options:0];
  if (!data) {
    replyHandler(nil, @"Invalid file data.");
    return;
  }

  if (![data writeToURL:url options:NSDataWritingAtomic error:&error]) {
    replyHandler(nil, error.localizedDescription);
    return;
  }

  NSString *identifier = [self identifierForURL:url];
  NSString *bookmark = [self bookmarkStringForURL:url error:&error];
  if (!bookmark) {
    replyHandler(nil, error.localizedDescription);
    return;
  }

  replyHandler(@{
    @"ok" : @YES,
    @"id" : identifier,
    @"bookmark" : bookmark
  }, nil);
}

- (NSArray<UTType *> *)contentTypesFromBody:(NSDictionary *)body {
  NSDictionary *accept = body[@"accept"];
  if (![accept isKindOfClass:[NSDictionary class]]) {
    return nil;
  }

  NSMutableArray<UTType *> *contentTypes = [NSMutableArray array];
  for (id value in accept.allValues) {
    if (![value isKindOfClass:[NSArray class]]) {
      continue;
    }
    for (id item in (NSArray *)value) {
      if (![item isKindOfClass:[NSString class]]) {
        continue;
      }
      NSString *extension = [(NSString *)item stringByTrimmingCharactersInSet:[NSCharacterSet characterSetWithCharactersInString:@"."]];
      if (extension.length > 0) {
        UTType *contentType = [UTType typeWithFilenameExtension:extension];
        if (contentType) {
          [contentTypes addObject:contentType];
        }
      }
    }
  }

  return contentTypes.count > 0 ? contentTypes : nil;
}

- (NSString *)bookmarkStringForURL:(NSURL *)url error:(NSError **)error {
  NSData *bookmarkData =
      [url bookmarkDataWithOptions:NSURLBookmarkCreationWithSecurityScope
       includingResourceValuesForKeys:nil
                        relativeToURL:nil
                                error:error];
  return bookmarkData ? [bookmarkData base64EncodedStringWithOptions:0] : nil;
}

- (NSString *)identifierForURL:(NSURL *)url {
  for (NSString *candidate in self.handles) {
    NSURL *storedURL = self.handles[candidate];
    if ([storedURL isEqual:url]) {
      return candidate;
    }
  }

  NSString *identifier = NSUUID.UUID.UUIDString;
  self.handles[identifier] = url;
  return identifier;
}

- (NSURL *)resolveURLForBody:(NSDictionary *)body error:(NSError **)error {
  NSString *identifier = body[@"id"];
  if ([identifier isKindOfClass:[NSString class]]) {
    NSURL *storedURL = self.handles[identifier];
    if (storedURL) {
      return storedURL;
    }
  }

  NSString *bookmark = body[@"bookmark"];
  if (![bookmark isKindOfClass:[NSString class]] || bookmark.length == 0) {
    if (error) {
      *error = [NSError errorWithDomain:@"workdaddy.native-file-system"
                                   code:404
                               userInfo:@{ NSLocalizedDescriptionKey : @"Unknown file handle." }];
    }
    return nil;
  }

  NSData *bookmarkData = [[NSData alloc] initWithBase64EncodedString:bookmark options:0];
  if (!bookmarkData) {
    if (error) {
      *error = [NSError errorWithDomain:@"workdaddy.native-file-system"
                                   code:400
                               userInfo:@{ NSLocalizedDescriptionKey : @"Invalid file bookmark." }];
    }
    return nil;
  }

  BOOL stale = NO;
  NSURL *url = [NSURL URLByResolvingBookmarkData:bookmarkData
                                         options:NSURLBookmarkResolutionWithSecurityScope
                                   relativeToURL:nil
                             bookmarkDataIsStale:&stale
                                           error:error];
  if (!url) {
    return nil;
  }

  [url startAccessingSecurityScopedResource];
  self.handles[[self identifierForURL:url]] = url;
  return url;
}


- (void)userContentController:(WKUserContentController *)userContentController
      didReceiveScriptMessage:(WKScriptMessage *)message {
}

@end

@interface AppDelegate : NSObject <NSApplicationDelegate, WKNavigationDelegate>
@property(nonatomic, strong) NativeFileSystemBridge *nativeFileSystemBridge;
@property(nonatomic, strong) NSWindow *window;
@property(nonatomic, strong) WKWebView *webView;
@end

@implementation AppDelegate

- (void)applicationDidFinishLaunching:(NSNotification *)notification {
  self.nativeFileSystemBridge = [[NativeFileSystemBridge alloc] init];

  WKUserContentController *userContentController = [[WKUserContentController alloc] init];
  [userContentController addScriptMessageHandlerWithReply:self.nativeFileSystemBridge
                                             contentWorld:WKContentWorld.pageWorld
                                                     name:@"nativeFileSystem"];

  NSURL *polyfillURL = [NSBundle.mainBundle URLForResource:@"file-system-polyfill" withExtension:@"js"];
  NSString *polyfillSource = [NSString stringWithContentsOfURL:polyfillURL encoding:NSUTF8StringEncoding error:nil];
  [userContentController addUserScript:[[WKUserScript alloc] initWithSource:polyfillSource ?: @""
                                                          injectionTime:WKUserScriptInjectionTimeAtDocumentStart
                                                       forMainFrameOnly:YES]];

  WKWebViewConfiguration *config = [[WKWebViewConfiguration alloc] init];
  config.userContentController = userContentController;
  config.defaultWebpagePreferences.allowsContentJavaScript = YES;
  [config.preferences setValue:@YES forKey:@"allowFileAccessFromFileURLs"];

  self.webView = [[WKWebView alloc] initWithFrame:NSZeroRect configuration:config];
  self.webView.navigationDelegate = self;

  self.window = [[NSWindow alloc] initWithContentRect:NSMakeRect(0, 0, 1440, 960)
                                           styleMask:NSWindowStyleMaskTitled |
                                                     NSWindowStyleMaskClosable |
                                                     NSWindowStyleMaskMiniaturizable |
                                                     NSWindowStyleMaskResizable |
                                                     NSWindowStyleMaskFullSizeContentView
                                             backing:NSBackingStoreBuffered
                                               defer:NO];
  self.window.title = @"workdaddy";
  self.window.minSize = NSMakeSize(1024, 720);
  self.window.contentView = self.webView;
  [self.window center];
  [self.window makeKeyAndOrderFront:nil];

  NSURL *indexURL = [NSBundle.mainBundle URLForResource:@"index" withExtension:@"html" subdirectory:@"web"];
  if (!indexURL) {
    [self presentFatalError:@"Cannot find bundled web/index.html"];
    return;
  }

  NSURL *webDirectory = [indexURL URLByDeletingLastPathComponent];
  [self.webView loadFileURL:indexURL allowingReadAccessToURL:webDirectory];
}

- (BOOL)applicationShouldTerminateAfterLastWindowClosed:(NSApplication *)sender {
  return YES;
}

- (void)webView:(WKWebView *)webView
    decidePolicyForNavigationAction:(WKNavigationAction *)navigationAction
                    decisionHandler:(void (^)(WKNavigationActionPolicy))decisionHandler {
  NSURL *url = navigationAction.request.URL;
  if (navigationAction.navigationType == WKNavigationTypeLinkActivated &&
      ([url.scheme isEqualToString:@"http"] || [url.scheme isEqualToString:@"https"])) {
    [NSWorkspace.sharedWorkspace openURL:url];
    decisionHandler(WKNavigationActionPolicyCancel);
    return;
  }

  decisionHandler(WKNavigationActionPolicyAllow);
}

- (void)presentFatalError:(NSString *)message {
  NSAlert *alert = [[NSAlert alloc] init];
  alert.messageText = @"workdaddy failed to start";
  alert.informativeText = message;
  alert.alertStyle = NSAlertStyleCritical;
  [alert runModal];
  [NSApp terminate:nil];
}

@end

int main(int argc, const char *argv[]) {
  @autoreleasepool {
    NSApplication *app = NSApplication.sharedApplication;
    AppDelegate *delegate = [[AppDelegate alloc] init];
    app.delegate = delegate;
    [app setActivationPolicy:NSApplicationActivationPolicyRegular];
    [app activateIgnoringOtherApps:YES];
    [app run];
  }
  return 0;
}
