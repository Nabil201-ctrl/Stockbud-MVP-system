import React from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

function ReloadPrompt() {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            
            console.log('SW Registered: ' + r)
        },
        onRegisterError(error) {
            console.log('SW registration error', error)
        },
    })

    const close = () => {
        setOfflineReady(false)
        setNeedRefresh(false)
    }

    return (
        <div className="ReloadPrompt-container">
            {(offlineReady || needRefresh) && (
                <div className="ReloadPrompt-toast">
                    <div className="ReloadPrompt-message">
                        {offlineReady
                            ? <span>App ready to work offline</span>
                            : <span>New content available, click on reload button to update.</span>
                        }
                    </div>
                    {needRefresh && (
                        <button className="ReloadPrompt-toast-button" onClick={() => updateServiceWorker(true)}>
                            Reload
                        </button>
                    )}
                    <button className="ReloadPrompt-toast-button" onClick={() => close()}>
                        Close
                    </button>
                </div>
            )}
            <style>{`
        .ReloadPrompt-container {
          padding: 0;
          margin: 0;
          width: 0;
          height: 0;
        }
        .ReloadPrompt-toast {
          position: fixed;
          right: 0;
          bottom: 0;
          margin: 16px;
          padding: 12px;
          border: 1px solid #8885;
          border-radius: 4px;
          z-index: 10000;
          text-align: left;
          box-shadow: 3px 4px 5px 0px #8885;
          background-color: white;
          color: black;
        }
        .ReloadPrompt-message {
          margin-bottom: 8px;
        }
        .ReloadPrompt-toast-button {
          border: 1px solid #8885;
          outline: none;
          margin-right: 5px;
          border-radius: 2px;
          padding: 3px 10px;
          cursor: pointer;
          background-color: transparent;
        }
      `}</style>
        </div>
    )
}

export default ReloadPrompt
